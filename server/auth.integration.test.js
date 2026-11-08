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
import community from './routes/community.js';
import pantry from './routes/pantry.js';
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
  app.use('/api/community', community);
  app.use('/api/pantry', pantry);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, body: await response.json() };
  };
  let token, userId, recipeId;
  try {
    await t.test(
      'rejects missing fields, malformed email and short or oversized passwords',
      async () => {
        for (const payload of [
          {},
          { firstName: ' ', email, password },
          { firstName: 'Test', email: 'invalid', password },
          { firstName: 'Test', email, password: 'short' },
          { firstName: 'Test', email, password: 'a'.repeat(73) },
          { firstName: 'Test', email: { $ne: null }, password },
        ]) {
          assert.equal((await request('/api/users/register', 'POST', payload)).status, 400);
        }
      }
    );
    await t.test('registers and normalizes email; stores a password hash', async () => {
      const result = await request('/api/users/register', 'POST', {
        firstName: ' בדיקה ',
        lastName: 'אוטומטית',
        email: ` ${email.toUpperCase()} `,
        password,
      });
      assert.equal(result.status, 201);
      const user = await User.findOne({ email });
      userId = user.id;
      assert.equal(user.firstName, 'בדיקה');
      assert.notEqual(user.password, password);
      assert.ok(await bcrypt.compare(password, user.password));
      assert.equal(result.body.password, undefined);
    });
    await t.test('rejects duplicate email including different capitalization', async () => {
      assert.equal(
        (
          await request('/api/users/register', 'POST', {
            firstName: 'Test',
            email: email.toUpperCase(),
            password,
          })
        ).status,
        409
      );
    });
    await t.test('rejects wrong passwords and unknown accounts with the same message', async () => {
      const wrong = await request('/api/users/login', 'POST', {
        email,
        password: 'wrong-password',
      });
      const missing = await request('/api/users/login', 'POST', { email: secondEmail, password });
      assert.equal(wrong.status, 401);
      assert.equal(missing.status, 401);
      assert.equal(wrong.body.message, missing.body.message);
      assert.equal(
        (await request('/api/users/login', 'POST', { email: { $ne: null }, password })).status,
        400
      );
    });
    await t.test(
      'logs in and retrieves the verified current user without password data',
      async () => {
        const result = await request('/api/users/login', 'POST', {
          email: ` ${email.toUpperCase()} `,
          password,
        });
        assert.equal(result.status, 200);
        token = result.body.token;
        assert.equal(jwt.verify(token, process.env.JWT_SECRET).id, userId);
        assert.equal(result.body.user.firstName, 'בדיקה');
        const current = await request('/api/users/me', 'GET', undefined, token);
        assert.equal(current.status, 200);
        assert.equal(current.body.user.id, userId);
        assert.equal(current.body.user.password, undefined);
      }
    );
    await t.test('rejects missing, forged, expired and deleted-user sessions', async () => {
      for (const badToken of [
        undefined,
        'invalid',
        jwt.sign({ id: userId }, 'wrong-secret'),
        jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: -1 }),
        jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET),
      ]) {
        assert.equal((await request('/api/users/me', 'GET', undefined, badToken)).status, 401);
      }
    });
    await t.test('requires login for writing recipes and records ownership', async () => {
      const payload = {
        title: `Auth test ${email}`,
        category: 'סלט',
        imageUrl: '/images/salad.svg',
        ingredients: 'מלפפון\nעגבנייה',
        steps: 'שוטפים\nקוצצים',
      };
      assert.equal((await request('/api/recipes', 'POST', payload)).status, 401);
      const created = await request('/api/recipes', 'POST', payload, token);
      assert.equal(created.status, 201);
      recipeId = created.body.recipe._id;
      assert.equal(created.body.recipe.createdBy, userId);
      assert.equal(created.body.recipe.ingredients.length, 2);
      assert.equal((await request('/api/recipes/mine')).status, 401);
      const mine = await request('/api/recipes/mine', 'GET', undefined, token);
      assert.equal(mine.status, 200);
      assert.deepEqual(
        mine.body.recipes.map((recipe) => recipe._id),
        [recipeId]
      );
      assert.equal(
        (await request(`/api/recipes/${recipeId}`, 'PATCH', { title: 'unauthorized' })).status,
        401
      );
      assert.equal((await request(`/api/recipes/${recipeId}`, 'DELETE')).status, 401);
    });
    await t.test('another user cannot edit or delete an owned recipe', async () => {
      await request('/api/users/register', 'POST', {
        firstName: 'Other',
        email: secondEmail,
        password,
      });
      const other = await request('/api/users/login', 'POST', { email: secondEmail, password });
      const otherRecipes = await request('/api/recipes/mine', 'GET', undefined, other.body.token);
      assert.deepEqual(otherRecipes.body.recipes, []);
      assert.equal(
        (
          await request(
            `/api/recipes/${recipeId}`,
            'PATCH',
            { title: 'unauthorized' },
            other.body.token
          )
        ).status,
        404
      );
      assert.equal(
        (await request(`/api/recipes/${recipeId}`, 'DELETE', undefined, other.body.token)).status,
        404
      );
      assert.ok(await Recipe.exists({ _id: recipeId }));
      const edited = await request(
        `/api/recipes/${recipeId}`,
        'PATCH',
        {
          title: 'Updated test recipe',
          ingredients: 'מלפפון\nעגבנייה\nמלח',
          steps: 'שוטפים\nקוצצים\nמערבבים',
        },
        token
      );
      assert.equal(edited.status, 200);
      assert.equal(edited.body.recipe.ingredients.length, 3);
      assert.equal(edited.body.recipe.steps.length, 3);
      assert.equal(
        (await request(`/api/recipes/${recipeId}`, 'PATCH', { ingredients: '  ' }, token)).status,
        400
      );
      assert.equal(
        (await request(`/api/recipes/${recipeId}`, 'DELETE', undefined, token)).status,
        200
      );
      assert.deepEqual(
        (await request('/api/recipes/mine', 'GET', undefined, token)).body.recipes,
        []
      );
    });
    await t.test('privacy defaults, optional photos and owner-only publication', async () => {
      const payload = {
        title: 'Private test',
        category: 'סלט',
        ingredients: ['מלפפון'],
        steps: ['קוצצים'],
      };
      const created = await request('/api/recipes', 'POST', payload, token);
      assert.equal(created.status, 201);
      const id = created.body.recipe._id;
      assert.equal(created.body.recipe.isPublic, false);
      assert.equal(created.body.recipe.imageUrl, '');
      const other = await request('/api/users/login', 'POST', { email: secondEmail, password });
      const otherToken = other.body.token;
      for (const viewer of [undefined, otherToken]) {
        assert.equal((await request(`/api/recipes/${id}`, 'GET', undefined, viewer)).status, 404);
      }
      assert.equal((await request(`/api/recipes/${id}`, 'GET', undefined, 'invalid')).status, 401);
      assert.equal((await request(`/api/recipes/${id}`, 'GET', undefined, token)).status, 200);
      assert.ok(
        (await request('/api/recipes/mine', 'GET', undefined, token)).body.recipes.some(
          (recipe) => recipe._id === id
        )
      );
      assert.ok(!(await request('/api/recipes')).body.recipes.some((recipe) => recipe._id === id));
      assert.notEqual((await request('/api/recipes/random')).body?._id, id);
      assert.equal(
        (await request(`/api/recipes/${id}`, 'PATCH', { isPublic: true }, otherToken)).status,
        404
      );
      for (const value of ['true', 'false', null, 1, {}]) {
        assert.equal(
          (await request(`/api/recipes/${id}`, 'PATCH', { isPublic: value }, token)).status,
          400
        );
        assert.equal(
          (await request('/api/recipes', 'POST', { ...payload, isPublic: value }, token)).status,
          400
        );
      }
      const published = await request(`/api/recipes/${id}`, 'PATCH', { isPublic: true }, token);
      assert.equal(published.status, 200);
      assert.equal(published.body.recipe.isPublic, true);
      assert.equal((await request(`/api/recipes/${id}`)).status, 200);
      assert.equal((await request(`/api/recipes/${id}`, 'GET', undefined, otherToken)).status, 200);
      assert.ok((await request('/api/recipes')).body.recipes.some((recipe) => recipe._id === id));
      await request(`/api/recipes/${id}`, 'PATCH', { isPublic: false, imageUrl: '' }, token);
      assert.equal((await request(`/api/recipes/${id}`)).status, 404);
      assert.ok(!(await request('/api/recipes')).body.recipes.some((recipe) => recipe._id === id));
      assert.equal(
        (await request(`/api/recipes/${id}`, 'GET', undefined, token)).body.recipe.isPublic,
        false
      );
      const explicitPublic = await request(
        '/api/recipes',
        'POST',
        { ...payload, isPublic: true },
        token
      );
      assert.equal(explicitPublic.status, 201);
      assert.equal((await request(`/api/recipes/${explicitPublic.body.recipe._id}`)).status, 200);
      // Bypass defaults to represent a document published before visibility existed.
      const legacy = await Recipe.collection.insertOne({
        ...payload,
        createdBy: new mongoose.Types.ObjectId(userId),
      });
      const legacyId = legacy.insertedId.toString();
      assert.equal((await request(`/api/recipes/${legacyId}`)).body.recipe.isPublic, true);
      assert.ok(
        (await request('/api/recipes')).body.recipes.some((recipe) => recipe._id === legacyId)
      );
      assert.equal(
        (await request(`/api/recipes/${legacyId}`, 'PATCH', { title: 'Edited legacy' }, token)).body
          .recipe.isPublic,
        true
      );
      await request(`/api/recipes/${legacyId}`, 'PATCH', { isPublic: false }, token);
      assert.equal((await request(`/api/recipes/${legacyId}`)).status, 404);
    });
    await t.test('following is idempotent and feeds contain only public recipes', async () => {
      const other = await request('/api/users/login', 'POST', { email: secondEmail, password });
      const follower = other.body.token;
      const payload = {
        title: 'Community recipe',
        category: 'סלט',
        ingredients: ['עגבניות'],
        steps: ['חותכים'],
        totalMinutes: 18,
      };
      const created = await request('/api/recipes', 'POST', { ...payload, isPublic: true }, token);
      assert.equal(created.status, 201);
      const visibleId = created.body.recipe._id;
      const privateRecipe = await request('/api/recipes', 'POST', payload, token);
      assert.equal(privateRecipe.status, 201);
      assert.equal(
        (await request('/api/recipes', 'POST', { ...payload, totalMinutes: '18' }, token)).status,
        400
      );
      assert.equal(
        (await request(`/api/recipes/${visibleId}`, 'PATCH', { totalMinutes: 0 }, token)).status,
        400
      );

      const profilePath = `/api/community/people/${userId}`;
      const followPath = `${profilePath}/follow`;
      const feedPath = '/api/community/feed';
      assert.equal((await request(feedPath)).status, 401);
      assert.equal((await request(followPath, 'PUT')).status, 401);
      assert.equal((await request(followPath, 'PUT', undefined, token)).status, 400);
      const updates = await Promise.all([
        request(followPath, 'PUT', undefined, follower),
        request(followPath, 'PUT', undefined, follower),
      ]);
      assert.ok(updates.every((response) => response.status === 200));
      const profile = (await request(profilePath, 'GET', undefined, follower)).body;
      assert.equal(profile.isFollowing, true);
      assert.deepEqual(Object.keys(profile.person).sort(), ['firstName', 'id']);
      assert.ok(profile.recipes.some((recipe) => recipe._id === visibleId));
      assert.ok(!profile.recipes.some((recipe) => recipe._id === privateRecipe.body.recipe._id));
      const feed = (await request(feedPath, 'GET', undefined, follower)).body;
      assert.equal(feed.following.length, 1);
      assert.equal(feed.recipes.find((recipe) => recipe._id === visibleId).totalMinutes, 18);
      assert.ok(!feed.recipes.some((recipe) => recipe._id === privateRecipe.body.recipe._id));
      const cleared = await request(
        `/api/recipes/${visibleId}`,
        'PATCH',
        { totalMinutes: null },
        token
      );
      assert.equal(cleared.status, 200);
      assert.equal(cleared.body.recipe.totalMinutes, null);
      await request(`/api/recipes/${visibleId}`, 'PATCH', { isPublic: false }, token);
      assert.ok(
        !(await request(feedPath, 'GET', undefined, follower)).body.recipes.some(
          (recipe) => recipe._id === visibleId
        )
      );
      assert.equal(
        (await request(followPath, 'DELETE', undefined, follower)).body.isFollowing,
        false
      );
      assert.deepEqual((await request(feedPath, 'GET', undefined, follower)).body.recipes, []);
    });

    await t.test(
      'public usernames are searchable, unique and editable only by the account owner',
      async () => {
        const other = await request('/api/users/login', 'POST', { email: secondEmail, password });
        const otherToken = other.body.token;
        const handle = 'cook_' + randomUUID().slice(0, 8);
        const update = '/api/community/profile';
        assert.equal((await request(update, 'PATCH', { username: handle })).status, 401);
        assert.equal((await request(update, 'PATCH', { username: '???' }, otherToken)).status, 400);
        const saved = await request(
          update,
          'PATCH',
          { username: '@' + handle.toUpperCase() },
          otherToken
        );
        assert.equal(saved.status, 200);
        assert.equal(saved.body.person.username, handle);
        assert.deepEqual(Object.keys(saved.body.person).sort(), ['firstName', 'id', 'username']);
        assert.equal((await request(update, 'PATCH', { username: handle }, token)).status, 409);
        const search = '/api/community/people?q=' + encodeURIComponent('@' + handle.slice(0, -1));
        assert.deepEqual((await request(search)).body.people, [saved.body.person]);
        const profile = '/api/community/people/' + saved.body.person.id;
        assert.equal((await request(profile)).status, 200);
        assert.equal((await request(profile + '/follow', 'PUT', undefined, token)).status, 200);
        await request(profile + '/follow', 'DELETE', undefined, token);
        assert.equal((await request(update, 'PATCH', { username: '' }, otherToken)).status, 200);
        assert.deepEqual((await request(search)).body.people, []);
        assert.equal((await request(profile)).status, 404);
      }
    );

    await t.test(
      'pantry chat validates turns and keeps provider credentials on the server',
      async () => {
        const previousKey = process.env.GEMINI_API_KEY;
        const originalFetch = globalThis.fetch;
        const messages = [{ role: 'user', text: 'יש לי ביצים ועגבניות' }];
        try {
          delete process.env.GEMINI_API_KEY;
          assert.equal((await request('/api/pantry/status')).body.available, false);
          assert.equal((await request('/api/pantry/chat', 'POST', { messages })).status, 503);
          process.env.GEMINI_API_KEY = 'fixture-key';
          let calls = 0;
          globalThis.fetch = async (url, options) => {
            if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) {
              return originalFetch(url, options);
            }
            calls++;
            assert.equal(options.headers['x-goog-api-key'], 'fixture-key');
            const input = JSON.parse(options.body);
            assert.equal(input.contents[0].parts[0].text, messages[0].text);
            assert.equal(input.contents[0].role, 'user');
            return new Response(
              JSON.stringify({
                candidates: [
                  {
                    content: {
                      parts: [{ thought: true, text: 'hidden' }, { text: 'שקשוקה · כ־20 דקות' }],
                    },
                  },
                ],
              })
            );
          };
          assert.equal(
            (
              await request('/api/pantry/chat', 'POST', {
                messages: [{ role: 'system', text: 'test' }],
              })
            ).status,
            400
          );
          assert.equal(calls, 0);
          const result = await request('/api/pantry/chat', 'POST', { messages });
          assert.equal(result.status, 200);
          assert.deepEqual(result.body, { answer: 'שקשוקה · כ־20 דקות' });
          assert.equal(calls, 1);
        } finally {
          globalThis.fetch = originalFetch;
          if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
          else process.env.GEMINI_API_KEY = previousKey;
        }
      }
    );

    await t.test(
      'password reset reports unavailable instead of claiming an email was sent',
      async () => {
        assert.equal((await request('/api/users/forgot-password', 'POST', { email })).status, 503);
      }
    );
    await t.test(
      'reset link is hashed, expires, works once and revokes previous sessions',
      async () => {
        const previousUrl = process.env.APP_URL;
        process.env.APP_URL = base;
        const messages = [];
        app.locals.sendPasswordResetEmail = async (message) => {
          messages.push(message);
        };
        try {
          const sent = await request('/api/users/forgot-password', 'POST', {
            email: email.toUpperCase(),
          });
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
          const unknown = await request('/api/users/forgot-password', 'POST', {
            email: `missing-${email}`,
          });
          assert.equal(unknown.body.message, sent.body.message);
          assert.equal(messages.length, 1);
          assert.equal(
            (await request('/api/users/forgot-password', 'POST', { email })).status,
            200
          );
          assert.equal(messages.length, 1, 'cooldown prevents repeated email');
          assert.equal(
            (await request('/api/users/reset-password', 'POST', { token: 'invalid', password }))
              .status,
            400
          );
          assert.equal(
            (
              await request('/api/users/reset-password', 'POST', {
                token: resetToken,
                password: 'short',
              })
            ).status,
            400
          );
          await User.updateOne(
            { _id: userId },
            { $set: { resetTokenExpires: new Date(Date.now() - 1000) } }
          );
          assert.equal(
            (await request('/api/users/reset-password', 'POST', { token: resetToken, password }))
              .status,
            400
          );
          await User.updateOne(
            { _id: userId },
            { $set: { resetTokenExpires: new Date(Date.now() + 60000) } }
          );
          const newPassword = `New-${randomUUID()}`;
          const simultaneous = await Promise.all(
            [1, 2].map(() =>
              request('/api/users/reset-password', 'POST', {
                token: resetToken,
                password: newPassword,
              })
            )
          );
          assert.deepEqual(simultaneous.map((result) => result.status).sort(), [200, 400]);
          assert.equal(
            (await request('/api/users/reset-password', 'POST', { token: resetToken, password }))
              .status,
            400
          );
          assert.equal((await request('/api/users/me', 'GET', undefined, token)).status, 401);
          assert.equal(
            (await request('/api/users/login', 'POST', { email, password })).status,
            401
          );
          const login = await request('/api/users/login', 'POST', { email, password: newPassword });
          assert.equal(login.status, 200);
          assert.equal(
            (await request('/api/users/me', 'GET', undefined, login.body.token)).status,
            200
          );
          const cleared = await User.findById(userId).select('+resetTokenHash');
          assert.equal(cleared.resetTokenHash, undefined);
          app.locals.sendPasswordResetEmail = async () => {
            throw new Error('Simulated mail outage');
          };
          assert.equal(
            (await request('/api/users/forgot-password', 'POST', { email })).status,
            503
          );
          assert.equal(
            (await User.findById(userId).select('+resetTokenHash')).resetTokenHash,
            undefined
          );
          assert.equal(
            (await request('/api/users/forgot-password', 'POST', { email })).status,
            429
          );
        } finally {
          delete app.locals.sendPasswordResetEmail;
          if (previousUrl === undefined) delete process.env.APP_URL;
          else process.env.APP_URL = previousUrl;
        }
      }
    );
  } finally {
    // Remove only records created by this run, including on assertion failure.
    const testUsers = await User.find({ email: { $in: [email, secondEmail] } }).select('_id');
    await Recipe.deleteMany({ createdBy: { $in: testUsers.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [email, secondEmail] } });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
