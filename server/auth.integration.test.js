import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import users from './routes/userRoutes.js';
import recipes from './routes/recipes.js';
import User from './models/User.js';
import Recipe from './models/Recipe.js';

dotenv.config();

test('registration, login, sessions and recipe permissions against MongoDB', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await User.init();
  const email = `auth-check-${randomUUID()}@example.test`;
  const secondEmail = `auth-check-${randomUUID()}@example.test`;
  const password = `Test-${randomUUID()}`;
  const app = express();
  app.use(express.json());
  app.use('/api/users', users);
  app.use('/api/recipes', recipes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, body: await response.json() };
  };
  let token, userId, recipeId;
  try {
    await t.test('rejects missing fields, malformed email and short or oversized passwords', async () => {
      for (const payload of [ {}, { firstName: ' ', email, password }, { firstName: 'Test', email: 'invalid', password }, { firstName: 'Test', email, password: 'short' }, { firstName: 'Test', email, password: 'a'.repeat(73) }, { firstName: 'Test', email: { $ne: null }, password } ]) {
        assert.equal((await request('/api/users/register', 'POST', payload)).status, 400);
      }
    });
    await t.test('registers and normalizes email; stores a password hash', async () => {
      const result = await request('/api/users/register', 'POST', { firstName: ' בדיקה ', lastName: 'אוטומטית', email: ` ${email.toUpperCase()} `, password });
      assert.equal(result.status, 201);
      const user = await User.findOne({ email });
      userId = user.id;
      assert.equal(user.firstName, 'בדיקה');
      assert.notEqual(user.password, password);
      assert.ok(await bcrypt.compare(password, user.password));
      assert.equal(result.body.password, undefined);
    });
    await t.test('rejects duplicate email including different capitalization', async () => {
      assert.equal((await request('/api/users/register', 'POST', { firstName: 'Test', email: email.toUpperCase(), password })).status, 409);
    });
    await t.test('rejects wrong passwords and unknown accounts with the same message', async () => {
      const wrong = await request('/api/users/login', 'POST', { email, password: 'wrong-password' });
      const missing = await request('/api/users/login', 'POST', { email: secondEmail, password });
      assert.equal(wrong.status, 401); assert.equal(missing.status, 401);
      assert.equal(wrong.body.message, missing.body.message);
      assert.equal((await request('/api/users/login', 'POST', { email: { $ne: null }, password })).status, 400);
    });
    await t.test('logs in and retrieves the verified current user without password data', async () => {
      const result = await request('/api/users/login', 'POST', { email: ` ${email.toUpperCase()} `, password });
      assert.equal(result.status, 200);
      token = result.body.token;
      assert.equal(jwt.verify(token, process.env.JWT_SECRET).id, userId);
      assert.equal(result.body.user.firstName, 'בדיקה');
      const current = await request('/api/users/me', 'GET', undefined, token);
      assert.equal(current.status, 200);
      assert.equal(current.body.user.id, userId);
      assert.equal(current.body.user.password, undefined);
    });
    await t.test('rejects missing, forged, expired and deleted-user sessions', async () => {
      for (const badToken of [undefined, 'invalid', jwt.sign({ id: userId }, 'wrong-secret'), jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET)]) {
        assert.equal((await request('/api/users/me', 'GET', undefined, badToken)).status, 401);
      }
    });
    await t.test('requires login for writing recipes and records ownership', async () => {
      const payload = { title: `Auth test ${email}`, category: 'סלט', imageUrl: '/images/salad.svg', ingredients: 'מלפפון\nעגבנייה', steps: 'שוטפים\nקוצצים' };
      assert.equal((await request('/api/recipes', 'POST', payload)).status, 401);
      const created = await request('/api/recipes', 'POST', payload, token);
      assert.equal(created.status, 201);
      recipeId = created.body.recipe._id;
      assert.equal(created.body.recipe.createdBy, userId);
      assert.equal(created.body.recipe.ingredients.length, 2);
      assert.equal((await request('/api/recipes/mine')).status, 401);
      const mine = await request('/api/recipes/mine', 'GET', undefined, token);
      assert.equal(mine.status, 200);
      assert.deepEqual(mine.body.recipes.map((recipe) => recipe._id), [recipeId]);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'PATCH', { title: 'unauthorized' })).status, 401);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'DELETE')).status, 401);
    });
    await t.test('another user cannot edit or delete an owned recipe', async () => {
      await request('/api/users/register', 'POST', { firstName: 'Other', email: secondEmail, password });
      const other = await request('/api/users/login', 'POST', { email: secondEmail, password });
      const otherRecipes = await request('/api/recipes/mine', 'GET', undefined, other.body.token);
      assert.deepEqual(otherRecipes.body.recipes, []);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'PATCH', { title: 'unauthorized' }, other.body.token)).status, 404);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'DELETE', undefined, other.body.token)).status, 404);
      assert.ok(await Recipe.exists({ _id: recipeId }));
      const edited = await request(`/api/recipes/${recipeId}`, 'PATCH', { title: 'Updated test recipe', ingredients: 'מלפפון\nעגבנייה\nמלח', steps: 'שוטפים\nקוצצים\nמערבבים' }, token);
      assert.equal(edited.status, 200);
      assert.equal(edited.body.recipe.ingredients.length, 3);
      assert.equal(edited.body.recipe.steps.length, 3);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'PATCH', { ingredients: '  ' }, token)).status, 400);
      assert.equal((await request(`/api/recipes/${recipeId}`, 'DELETE', undefined, token)).status, 200);
      assert.deepEqual((await request('/api/recipes/mine', 'GET', undefined, token)).body.recipes, []);
    });
    await t.test('password reset reports unavailable instead of claiming an email was sent', async () => {
      assert.equal((await request('/api/users/forgot-password', 'POST', { email })).status, 503);
    });
    await t.test('reset link is hashed, expires, works once and revokes previous sessions', async () => {
      const previousUrl = process.env.APP_URL;
      process.env.APP_URL = base;
      const messages = [];
      app.locals.sendPasswordResetEmail = async (message) => { messages.push(message); };
      try {
        const sent = await request('/api/users/forgot-password', 'POST', { email: email.toUpperCase() });
        assert.equal(sent.status, 200);
        assert.equal(messages.length, 1);
        assert.equal(messages[0].to, email);
        const url = new URL(messages[0].resetUrl);
        assert.equal(url.origin, base);
        assert.equal(url.pathname, '/reset-password');
        assert.equal(url.search, '');
        const resetToken = new URLSearchParams(url.hash.slice(1)).get('token');
        const stored = await User.findById(userId).select('+resetTokenHash +resetTokenExpires');
        assert.notEqual(stored.resetTokenHash, resetToken);
        assert.equal(stored.resetTokenHash.length, 64);
        assert.ok(stored.resetTokenExpires > new Date());
        const unknown = await request('/api/users/forgot-password', 'POST', { email: `missing-${email}` });
        assert.equal(unknown.body.message, sent.body.message);
        assert.equal(messages.length, 1);
        assert.equal((await request('/api/users/forgot-password', 'POST', { email })).status, 200);
        assert.equal(messages.length, 1, 'cooldown prevents repeated email');
        assert.equal((await request('/api/users/reset-password', 'POST', { token: 'invalid', password })).status, 400);
        assert.equal((await request('/api/users/reset-password', 'POST', { token: resetToken, password: 'short' })).status, 400);
        await User.updateOne({ _id: userId }, { $set: { resetTokenExpires: new Date(Date.now() - 1000) } });
        assert.equal((await request('/api/users/reset-password', 'POST', { token: resetToken, password })).status, 400);
        await User.updateOne({ _id: userId }, { $set: { resetTokenExpires: new Date(Date.now() + 60000) } });
        const newPassword = `New-${randomUUID()}`;
        const simultaneous = await Promise.all([1, 2].map(() => request('/api/users/reset-password', 'POST', { token: resetToken, password: newPassword })));
        assert.deepEqual(simultaneous.map((result) => result.status).sort(), [200, 400]);
        assert.equal((await request('/api/users/reset-password', 'POST', { token: resetToken, password })).status, 400);
        assert.equal((await request('/api/users/me', 'GET', undefined, token)).status, 401);
        assert.equal((await request('/api/users/login', 'POST', { email, password })).status, 401);
        const login = await request('/api/users/login', 'POST', { email, password: newPassword });
        assert.equal(login.status, 200);
        assert.equal((await request('/api/users/me', 'GET', undefined, login.body.token)).status, 200);
        const cleared = await User.findById(userId).select('+resetTokenHash');
        assert.equal(cleared.resetTokenHash, undefined);
        app.locals.sendPasswordResetEmail = async () => { throw new Error('Simulated mail outage'); };
        assert.equal((await request('/api/users/forgot-password', 'POST', { email })).status, 503);
        assert.equal((await User.findById(userId).select('+resetTokenHash')).resetTokenHash, undefined);
        assert.equal((await request('/api/users/forgot-password', 'POST', { email })).status, 429);
      } finally {
        delete app.locals.sendPasswordResetEmail;
        if (previousUrl === undefined) delete process.env.APP_URL;
        else process.env.APP_URL = previousUrl;
      }
    });
  } finally {
    // Remove only records created by this run, including on assertion failure.
    const testUsers = await User.find({ email: { $in: [email, secondEmail] } }).select('_id');
    await Recipe.deleteMany({ createdBy: { $in: testUsers.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [email, secondEmail] } });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
