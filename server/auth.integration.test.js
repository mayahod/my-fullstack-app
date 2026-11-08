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
import library from './routes/library.js';
import Collection from './models/Collection.js';
import User from './models/User.js';
import Recipe from './models/Recipe.js';

dotenv.config();

test('registration, login, sessions and recipe permissions against MongoDB', async (t) => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await User.init();
  const email = `auth-check-${randomUUID()}@example.test`;
  const secondEmail = `auth-check-${randomUUID()}@example.test`;
  const googleEmail = `auth-check-${randomUUID()}@gmail.com`;
  const password = `Test-${randomUUID()}`;
  const newPassword = `New-${randomUUID()}`;
  const app = express();
  app.use(express.json());
  app.use('/api/users', users);
  app.use('/api/recipes', recipes);
  app.use('/api/community', community);
  app.use('/api/pantry', pantry);
  app.use('/api/library', library);
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
    await t.test('catalog filters and library membership respect recipe visibility', async () => {
      const second = await request('/api/users/login', 'POST', { email: secondEmail, password });
      assert.equal(second.status, 200);
      const other = second.body.token;
      const marker = randomUUID().slice(0, 12);
      const recipePayload = {
        title: 'Catalog ' + marker,
        category: 'מרק',
        difficulty: 'easy',
        totalMinutes: 20,
        ingredients: ['עגבניות ' + marker, 'בצל'],
        steps: ['מבשלים'],
      };
      const published = (
        await request('/api/recipes', 'POST', { ...recipePayload, isPublic: true }, token)
      ).body.recipe;
      const secondPublic = (
        await request('/api/recipes', 'POST', { ...recipePayload, isPublic: true }, token)
      ).body.recipe;
      const privateRecipe = (await request('/api/recipes', 'POST', recipePayload, token)).body
        .recipe;
      const catalog =
        '/api/recipes/catalog?ingredients=' +
        marker +
        ',בצל&difficulty=easy&maxMinutes=25&pageSize=1';
      const firstPage = (await request(catalog)).body;
      const nextPage = (await request(catalog + '&page=2')).body;
      assert.equal(firstPage.total, 2);
      assert.deepEqual(
        new Set([firstPage.recipes[0]._id, nextPage.recipes[0]._id]),
        new Set([published._id, secondPublic._id])
      );
      const matches = (
        await request('/api/recipes/catalog?sort=match&ingredients=' + marker + ',עגבניות')
      ).body;
      assert.deepEqual(matches.recipes[0].matchedIngredients, [marker, 'עגבניות']);
      assert.ok(!matches.recipes.some((recipe) => recipe._id === privateRecipe._id));
      assert.equal((await request('/api/recipes/catalog?pageSize=500')).status, 400);
      assert.equal((await request('/api/library')).status, 401);
      const favorites = '/api/library/collections/favorites/recipes/';
      assert.equal(
        (await request(favorites + privateRecipe._id, 'PUT', undefined, other)).status,
        404
      );
      const saved = await Promise.all([
        request(favorites + published._id, 'PUT', undefined, other),
        request(favorites + published._id, 'PUT', undefined, other),
      ]);
      assert.ok(saved.every(({ status }) => status === 200));
      assert.equal(
        (await request('/api/library', 'GET', undefined, other)).body.collections[0].recipes.length,
        1
      );
      const custom = (
        await request('/api/library/collections', 'PUT', { name: 'Quick meals' }, other)
      ).body;
      const membership = '/api/library/collections/' + custom.id + '/recipes/' + published._id;
      assert.equal((await request(membership, 'PUT', undefined, token)).status, 404);
      assert.equal((await request(membership, 'PUT', undefined, other)).status, 200);
      await request('/api/recipes/' + published._id, 'PATCH', { isPublic: false }, token);
      assert.ok(
        (await request('/api/library', 'GET', undefined, other)).body.collections.every(
          ({ recipes }) => recipes.length === 0
        )
      );
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
      const discover = await request('/api/community/discover');
      assert.equal(discover.status, 200);
      assert.equal(
        discover.body.recipes.find((recipe) => recipe._id === visibleId).author.id,
        userId
      );
      assert.ok(
        !discover.body.recipes.some((recipe) => recipe._id === privateRecipe.body.recipe._id)
      );
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

      const postPath = '/api/community/posts/' + visibleId;
      const likePath = postPath + '/like';
      const commentsPath = postPath + '/comments';
      const comment = { id: randomUUID(), text: '  מתכון מצוין!  ' };
      assert.equal((await request(likePath, 'PUT')).status, 401);
      assert.equal((await request(commentsPath, 'POST', comment)).status, 401);
      assert.equal(
        (await request(commentsPath, 'POST', { ...comment, text: '  ' }, follower)).status,
        400
      );
      const likes = await Promise.all([
        request(likePath, 'PUT', undefined, follower),
        request(likePath, 'PUT', undefined, follower),
      ]);
      for (const like of likes) {
        assert.equal(like.status, 200);
        assert.deepEqual(like.body, { liked: true, likeCount: 1 });
      }
      const posted = await request(commentsPath, 'POST', comment, follower);
      assert.equal(posted.status, 201);
      assert.equal(posted.body.comment.text, 'מתכון מצוין!');
      assert.equal((await request(commentsPath, 'POST', comment, follower)).status, 200);
      const discussion = (await request(postPath)).body;
      assert.equal(discussion.liked, false);
      assert.equal(discussion.likeCount, 1);
      assert.equal(discussion.comments.length, 1);
      assert.equal(discussion.comments[0].canDelete, false);
      assert.equal(discussion.comments[0].author.email, undefined);
      const post = (await request(feedPath, 'GET', undefined, follower)).body.recipes.find(
        (recipe) => recipe._id === visibleId
      );
      assert.equal(post.liked, true);
      assert.equal(post.likeCount, 1);
      assert.equal(post.commentCount, 1);
      assert.equal(post.likes, undefined);
      assert.equal(post.comments, undefined);
      assert.deepEqual((await request(likePath, 'DELETE', undefined, follower)).body, {
        liked: false,
        likeCount: 0,
      });
      assert.equal(
        (await request(commentsPath + '/' + comment.id, 'DELETE', undefined, token)).status,
        200
      );
      assert.deepEqual((await request(postPath)).body.comments, []);
      const cleared = await request(
        `/api/recipes/${visibleId}`,
        'PATCH',
        { totalMinutes: null },
        token
      );
      assert.equal(cleared.status, 200);
      assert.equal(cleared.body.recipe.totalMinutes, null);
      await request(`/api/recipes/${visibleId}`, 'PATCH', { isPublic: false }, token);
      assert.equal((await request(postPath, 'GET', undefined, token)).status, 404);
      assert.equal((await request(likePath, 'PUT', undefined, follower)).status, 404);
      assert.equal((await request(commentsPath, 'POST', comment, follower)).status, 404);
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
        const avatarPath = '/api/community/profile/avatar';
        const image =
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2sAAAAASUVORK5CYII=';
        const avatar = 'data:image/png;base64,' + image;
        assert.equal((await request(avatarPath, 'PUT', { avatar })).status, 401);
        assert.equal(
          (await request(avatarPath, 'PUT', { avatar: 'https://example.com/' }, otherToken)).status,
          400
        );
        const photo = await request(avatarPath, 'PUT', { avatar }, otherToken);
        assert.equal(photo.status, 200);
        assert.equal(photo.body.person.avatar, undefined);
        assert.equal(
          (await request(search)).body.people[0].avatarVersion,
          photo.body.person.avatarVersion
        );
        const imageUrl = base + profile + '/avatar?v=' + photo.body.person.avatarVersion;
        const downloaded = await fetch(imageUrl);
        assert.equal(downloaded.status, 200);
        assert.equal(downloaded.headers.get('content-type'), 'image/png');
        assert.equal(Buffer.from(await downloaded.arrayBuffer()).toString('base64'), image);
        assert.equal((await request(avatarPath, 'DELETE', undefined, otherToken)).status, 200);
        assert.equal((await fetch(imageUrl)).status, 404);
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
                      parts: [
                        { thought: true, text: 'hidden' },
                        { text: 'שקשוקה · כ\u05be20 דקות' },
                      ],
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
          assert.deepEqual(result.body, { answer: 'שקשוקה · כ-20 דקות' });
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
    await t.test(
      'Google registration and linking preserve distinct account ownership',
      async () => {
        const previousClientId = process.env.GOOGLE_CLIENT_ID;
        process.env.GOOGLE_CLIENT_ID = 'integration-test.apps.googleusercontent.com';
        const newClaims = {
          sub: randomUUID(),
          email: googleEmail,
          email_verified: true,
          given_name: 'Google Test',
        };
        const existingClaims = { ...newClaims, sub: randomUUID(), email, hd: 'example.test' };
        const claimsByCredential = {
          new: newClaims,
          existing: existingClaims,
          changed: { ...newClaims, email: 'changed-address@example.test' },
          unverified: { ...newClaims, email_verified: false },
          external: { ...newClaims, sub: randomUUID(), email: 'third-party@example.test' },
          mismatch: { ...existingClaims, email: secondEmail },
        };
        app.locals.googleVerifier = {
          async verifyIdToken({ idToken, audience }) {
            assert.equal(audience, 'integration-test.apps.googleusercontent.com');
            const claims = claimsByCredential[idToken];
            if (!claims) throw new Error('Invalid token');
            return { getPayload: () => claims };
          },
        };
        const signIn = (credential) => request('/api/users/google', 'POST', { credential });
        const link = (credential, session) =>
          request('/api/users/google/link', 'POST', { credential }, session);
        try {
          const passwordLogin = await request('/api/users/login', 'POST', {
            email,
            password: newPassword,
          });
          assert.equal(passwordLogin.status, 200);
          const session = passwordLogin.body.token;
          assert.deepEqual((await request('/api/users/google/config')).body, {
            clientId: process.env.GOOGLE_CLIENT_ID,
          });
          assert.equal((await signIn('invalid')).status, 401);
          assert.equal((await signIn('unverified')).status, 401);
          assert.equal((await signIn('external')).status, 403);
          assert.equal((await signIn('existing')).status, 409);
          assert.equal((await link('existing')).status, 401);
          assert.equal((await link('mismatch', session)).status, 403);
          assert.equal((await link('existing', session)).body.user.googleLinked, true);
          assert.equal((await signIn('existing')).body.user.id, userId);
          assert.equal(
            (await request('/api/users/me', 'GET', undefined, session)).body.user.id,
            userId
          );

          const [first, simultaneous] = await Promise.all([signIn('new'), signIn('new')]);
          assert.equal(first.status, 200);
          assert.equal(simultaneous.status, 200);
          assert.equal(first.body.user.id, simultaneous.body.user.id);
          assert.equal(first.body.user.googleSubject, undefined);
          assert.equal((await signIn('changed')).body.user.id, first.body.user.id);
          assert.equal(await User.countDocuments({ email: googleEmail }), 1);
          assert.equal((await User.findOne({ email: googleEmail })).password, undefined);
          assert.equal(
            (await request('/api/users/login', 'POST', { email: googleEmail, password })).status,
            401
          );
        } finally {
          delete app.locals.googleVerifier;
          if (previousClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
          else process.env.GOOGLE_CLIENT_ID = previousClientId;
        }
      }
    );
  } finally {
    // Remove only records created by this run, including on assertion failure.
    const testUsers = await User.find({ email: { $in: [email, secondEmail] } }).select('_id');
    await Collection.deleteMany({ owner: { $in: testUsers.map((user) => user._id) } });
    await Recipe.deleteMany({ createdBy: { $in: testUsers.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [email, secondEmail, googleEmail] } });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
