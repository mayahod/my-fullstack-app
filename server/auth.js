import { createHash, randomBytes } from 'node:crypto';
import Session from './models/Session.js';
import User from './models/User.js';

const SESSION_LIFETIME_MS = 2 * 60 * 60_000;
const sessionCookie = (req) =>
  process.env.NODE_ENV === 'production' || req.secure ? '__Host-recipe_session' : 'recipe_session';
const cookieOptions = (req) => ({
  httpOnly: true,
  secure: sessionCookie(req).startsWith('__Host-'),
  sameSite: 'lax',
  path: '/',
});
const hash = (secret) => createHash('sha256').update(secret).digest('hex');

function sessionKey(req) {
  const prefix = sessionCookie(req) + '=';
  const value = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return /^[a-zA-Z0-9_-]{43}$/.test(value ?? '') ? hash(value) : null;
}

export async function startSession(req, res, user) {
  const secret = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const previous = sessionKey(req);
  await Session.create({
    _id: hash(secret),
    userId: user._id,
    passwordVersion: user.passwordVersion || 0,
    expiresAt,
  });
  if (previous) await Session.deleteOne({ _id: previous });
  res.cookie(sessionCookie(req), secret, { ...cookieOptions(req), expires: expiresAt });
  return res.json({ user: publicUser(user), expiresAt });
}

export async function endSession(req, res, next) {
  try {
    const key = sessionKey(req);
    if (key) await Session.deleteOne({ _id: key });
    clearSessionCookie(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export function clearSessionCookie(req, res) {
  res.clearCookie(sessionCookie(req), cookieOptions(req));
}

export function publicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.firstName,
    email: user.email,
    ...(user.googleSubject ? { googleLinked: true } : {}),
  };
}

async function authenticate(req, res, next, required) {
  try {
    const key = sessionKey(req);
    const session = key && (await Session.findOne({ _id: key, expiresAt: { $gt: new Date() } }));
    const user = session && (await User.findById(session.userId));
    if (user && (user.passwordVersion || 0) === session.passwordVersion) {
      req.user = user;
      req.sessionExpiresAt = session.expiresAt;
      return next();
    }
    if (required) return res.status(401).json({ message: 'יש להתחבר מחדש' });
    return next();
  } catch (error) {
    return next(error);
  }
}

export const requireAuth = (req, res, next) => authenticate(req, res, next, true);
export const optionalAuth = (req, res, next) => authenticate(req, res, next, false);
