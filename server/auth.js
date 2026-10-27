import jwt from 'jsonwebtoken';
import User from './models/User.js';

export function getSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return process.env.JWT_SECRET;
}

export function publicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.firstName,
    email: user.email,
  };
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ message: 'יש להתחבר כדי להמשיך' });
    const decoded = jwt.verify(header.slice(7), getSecret(), { algorithms: ['HS256'] });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'יש להתחבר מחדש' });
    if ((decoded.version || 0) !== (user.passwordVersion || 0))
      return res.status(401).json({ message: 'הסיסמה שונתה. יש להתחבר מחדש' });
    req.user = user;
    next();
  } catch (error) {
    if (
      ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError', 'CastError'].includes(error.name)
    ) {
      return res.status(401).json({ message: 'ההתחברות אינה תקפה, יש להתחבר מחדש' });
    }
    return res.status(500).json({ message: 'שגיאה בשרת' });
  }
}

// Public recipe reads accept an optional session, but never trust an unverified token.
export function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, next);
}
