import { createHmac } from 'node:crypto';
import LoginAttempt from './models/LoginAttempt.js';

const WINDOW_MS = 15 * 60_000;
const IP_LIMIT = 30;
const ACCOUNT_LIMIT = 8;
const noCooldown = new Date(0);

export function loginBucketKey(scope, value) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update(scope + ':' + value)
    .digest('hex');
}

async function reserveAttempt(scope, value, limit, progressive) {
  const _id = loginBucketKey(scope, value);
  const now = new Date();
  const nextExpiry = new Date(now.getTime() + WINDOW_MS);
  const expired = { $lte: [{ $ifNull: ['$expiresAt', now] }, now] };
  const available = {
    $and: [{ $lt: ['$count', limit] }, { $lte: ['$nextAllowedAt', now] }],
  };
  const allowed = { $or: [expired, available] };
  const count = { $cond: [expired, 1, { $add: ['$count', 1] }] };
  // Reserve before bcrypt so simultaneous requests cannot share the same available attempt.
  const delay = progressive
    ? {
        $cond: [
          { $lt: [count, 4] },
          0,
          { $multiply: [1000, { $pow: [2, { $subtract: [count, 3] }] }] },
        ],
      }
    : 0;
  const nextAllowedAt = {
    $cond: [{ $gt: [delay, 0] }, { $add: [now, delay] }, noCooldown],
  };
  const update = [
    {
      $set: {
        expiresAt: { $cond: [expired, nextExpiry, '$expiresAt'] },
        count: { $cond: [allowed, count, '$count'] },
        nextAllowedAt: { $cond: [allowed, nextAllowedAt, '$nextAllowedAt'] },
      },
    },
  ];
  const reserve = () => LoginAttempt.findOneAndUpdate({ _id }, update, { upsert: true }).lean();
  let previous;
  try {
    previous = await reserve();
  } catch (error) {
    if (error.code !== 11000) throw error;
    previous = await reserve();
  }

  if (!previous || previous.expiresAt <= now) return { _id, count: 1, expiresAt: nextExpiry };
  const retryAt = previous.count >= limit ? previous.expiresAt : previous.nextAllowedAt;
  if (retryAt > now) {
    return { retryAfter: Math.ceil((Math.min(retryAt, previous.expiresAt) - now) / 1000) };
  }
  return { _id, count: previous.count + 1, expiresAt: previous.expiresAt };
}

export async function reserveLogin(ip, email) {
  const ipAttempt = await reserveAttempt('ip', ip, IP_LIMIT, false);
  if (ipAttempt.retryAfter) return ipAttempt;
  return reserveAttempt('email', email, ACCOUNT_LIMIT, true);
}

export const clearLoginFailures = (reservation) => LoginAttempt.deleteOne(reservation);
