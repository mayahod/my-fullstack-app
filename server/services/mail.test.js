import test from 'node:test';
import assert from 'node:assert/strict';
import { mailConfigured, sendPasswordResetEmail, publicAppUrl } from './mail.js';
import { rateLimit } from '../rateLimit.js';

test('Resend integration submits the right message and surfaces provider errors', async () => {
  const old = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, app: process.env.APP_URL, mode: process.env.NODE_ENV };
  const originalFetch = globalThis.fetch;
  try {
    process.env.RESEND_API_KEY = 'test-key'; process.env.MAIL_FROM = 'Recipes <noreply@example.test>';
    process.env.APP_URL = 'https://recipes.example.test';
    assert.equal(mailConfigured(), true);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      const data = JSON.parse(options.body);
      assert.deepEqual(data.to, ['recipient@example.test']);
      assert.equal(data.from, process.env.MAIL_FROM);
      assert.ok(data.text.includes('/reset-password#token=abc'));
      return { ok: true, json: async () => ({ id: 'test-message' }) };
    };
    await sendPasswordResetEmail({ to: 'recipient@example.test', resetUrl: `${publicAppUrl()}/reset-password#token=abc` });
    globalThis.fetch = async () => ({ ok: false, status: 403 });
    await assert.rejects(sendPasswordResetEmail({ to: 'recipient@example.test', resetUrl: 'https://recipes.example.test' }), /rejected/);
    process.env.NODE_ENV = 'production'; process.env.APP_URL = 'http://insecure.example.test';
    assert.equal(mailConfigured(), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ RESEND_API_KEY: old.key, MAIL_FROM: old.from, APP_URL: old.app, NODE_ENV: old.mode })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('rate limits stop repeated requests and return a retry time', () => {
  const middleware = rateLimit({ limit: 2 });
  let passed = 0, status, retry;
  const response = { set: (key, value) => { retry = value; }, status: (value) => { status = value; return response; }, json: () => {} };
  for (let i = 0; i < 3; i++) middleware({ ip: 'test-ip' }, response, () => passed++);
  assert.equal(passed, 2); assert.equal(status, 429); assert.ok(Number(retry) > 0);
});
