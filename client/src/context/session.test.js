import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenExpiry, validToken } from './session.js';

const token = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
test('only unexpired, well-formed sessions pass the client expiry check', () => {
  for (const value of [null, '', 'garbage', 'a.b.c', token(0), token(Math.floor(Date.now() / 1000) - 1), token('tomorrow')]) {
    assert.equal(validToken(value), false);
  }
  const expiry = Math.floor(Date.now() / 1000) + 60;
  assert.equal(validToken(token(expiry)), true);
  assert.equal(tokenExpiry(token(expiry)), expiry * 1000);
});
