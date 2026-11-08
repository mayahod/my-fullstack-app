import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, createHash } from 'node:crypto';
import { mailConfigured, publicAppUrl, sendPasswordResetEmail } from '../services/mail.js';

import { publicUser, userSession } from '../auth.js';
const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 30 * 60_000;
const RESET_REQUEST_COOLDOWN_MS = 60_000;

const normalizedEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const google = new OAuth2Client();
const googleConflict =
  'כבר קיים חשבון עם האימייל הזה. התחברו עם סיסמה וקשרו את Google באזור האישי.';

export const googleConfig = (_req, res) =>
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null });

export const verifyGoogle = async (req, res, next) => {
  const audience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!audience) return res.status(503).json({ message: 'התחברות עם Google עדיין אינה זמינה' });
  const { credential } = req.body ?? {};
  if (typeof credential !== 'string' || !credential || credential.length > 8192)
    return res.status(400).json({ message: 'פרטי ההתחברות עם Google חסרים או אינם תקינים' });

  let claims;
  try {
    const verifier = req.app.locals.googleVerifier || google;
    const ticket = await verifier.verifyIdToken({ idToken: credential, audience });
    claims = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'לא ניתן לאמת את ההתחברות עם Google' });
  }

  const email = normalizedEmail(claims?.email);
  if (
    typeof claims?.sub !== 'string' ||
    !claims.sub ||
    claims.email_verified !== true ||
    !validEmail(email)
  )
    return res.status(401).json({ message: 'נדרש חשבון Google עם כתובת אימייל מאומתת' });

  req.googleIdentity = { ...claims, email };
  next();
};

export const loginWithGoogle = async (req, res) => {
  const { sub: googleSubject, email, hd, given_name, family_name } = req.googleIdentity;
  try {
    await User.init();
    const linked = await User.findOne({ googleSubject });
    if (linked) return res.json(userSession(linked));

    // Google can vouch for current mailbox ownership for Gmail and Workspace addresses.
    if (!email.endsWith('@gmail.com') && !hd)
      return res.status(403).json({
        message:
          'להרשמה דרך Google נדרש Gmail או Google Workspace. אפשר להירשם עם סיסמה ולקשר את החשבון באזור האישי.',
      });

    const user = await User.create({
      googleSubject,
      email,
      firstName: given_name?.trim().slice(0, 100) || 'משתמש Google',
      lastName: family_name?.trim().slice(0, 100),
    });
    return res.json(userSession(user));
  } catch (error) {
    if (error.code === 11000) {
      // Simultaneous first sign-ins with the same Google account share one user.
      const linked = await User.findOne({ googleSubject }).catch(() => null);
      if (linked) return res.json(userSession(linked));
      return res.status(409).json({ message: googleConflict });
    }
    return res.status(500).json({ message: 'שגיאה בשרת, נסו שוב מאוחר יותר' });
  }
};

export const linkGoogle = async (req, res) => {
  const { sub: googleSubject, email } = req.googleIdentity;
  if (email !== req.user.email)
    return res.status(403).json({ message: 'כתובת האימייל של Google צריכה להתאים לחשבון באתר' });
  const conflict = 'אחד החשבונות כבר מקושר לחשבון אחר';
  try {
    await User.init();
    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        email,
        $or: [{ googleSubject: { $exists: false } }, { googleSubject }],
      },
      { $set: { googleSubject } },
      { new: true }
    );
    if (!user) return res.status(409).json({ message: conflict });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: conflict });
    return res.status(500).json({ message: 'שגיאה בשרת, נסו שוב מאוחר יותר' });
  }
};

export const registerUser = async (req, res) => {
  try {
    const firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
    const email = normalizedEmail(req.body.email);
    const password = req.body.password;
    if (!firstName || firstName.length > 100 || lastName.length > 100 || !validEmail(email)) {
      return res.status(400).json({ message: 'נא להזין שם פרטי ואימייל תקינים' });
    }
    if (
      typeof password !== 'string' ||
      password.trim().length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ message: 'הסיסמה צריכה להכיל לפחות 8 תווים ועד 72 בתים' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: 'משתמש עם האימייל הזה כבר קיים' });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: 'משתמש עם האימייל הזה כבר קיים' });
    res.status(500).json({ message: 'שגיאה בשרת, נסו שוב מאוחר יותר' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = normalizedEmail(req.body.email);
    const password = req.body.password;
    if (
      !validEmail(email) ||
      typeof password !== 'string' ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ message: 'נא להזין אימייל וסיסמה תקינים' });
    }

    const user = await User.findOne({ email });
    if (!user?.password) return res.status(401).json({ message: 'האימייל או הסיסמה שגויים' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'האימייל או הסיסמה שגויים' });

    res.status(200).json(userSession(user));
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בשרת, נסו שוב מאוחר יותר' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = normalizedEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ message: 'נא להזין אימייל תקין' });
    const mailer = req.app.locals.sendPasswordResetEmail || sendPasswordResetEmail;
    if (!req.app.locals.sendPasswordResetEmail && !mailConfigured()) {
      return res.status(503).json({ message: 'שירות המייל טרם הוגדר. לא נשלח מייל.' });
    }
    const message =
      'אם קיים חשבון עם האימייל הזה, יישלח אליו קישור לאיפוס סיסמה. הקישור תקף ל-30 דקות.';
    const rawToken = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    // Unknown accounts and cooldowns share a response to avoid revealing registered emails.
    const user = await User.findOneAndUpdate(
      {
        email,
        password: { $type: 'string' },
        $or: [
          { resetRequestedAt: { $exists: false } },
          { resetRequestedAt: { $lt: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) } },
        ],
      },
      {
        $set: {
          resetTokenHash: hash,
          resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          resetRequestedAt: now,
        },
      },
      { new: true }
    );
    if (!user) return res.json({ message });
    try {
      const resetUrl = `${publicAppUrl()}/reset-password#token=${rawToken}`;
      await mailer({ to: user.email, resetUrl });
    } catch {
      await User.updateOne(
        { _id: user._id, resetTokenHash: hash },
        { $unset: { resetTokenHash: '', resetTokenExpires: '', resetRequestedAt: '' } }
      );
      return res.status(503).json({ message: 'שליחת המייל נכשלה. נסו שוב מאוחר יותר.' });
    }
    return res.json({ message });
  } catch (e) {
    return res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    return res.status(400).json({ message: 'הקישור אינו תקין או שפג תוקפו. בקשו קישור חדש.' });
  if (
    typeof password !== 'string' ||
    password.trim().length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ message: 'הסיסמה צריכה להכיל לפחות 8 תווים ועד 72 בתים' });
  }
  try {
    const hash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // An atomic update allows only one submission to consume this reset token.
    const user = await User.findOneAndUpdate(
      { resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } },
      {
        $set: { password: passwordHash },
        $inc: { passwordVersion: 1 },
        $unset: { resetTokenHash: '', resetTokenExpires: '', resetRequestedAt: '' },
      }
    );
    if (!user)
      return res.status(400).json({ message: 'הקישור אינו תקין או שפג תוקפו. בקשו קישור חדש.' });
    return res.json({ message: 'הסיסמה עודכנה בהצלחה. כעת אפשר להתחבר עם הסיסמה החדשה.' });
  } catch {
    return res.status(500).json({ message: 'שגיאה בשרת. נסו שוב מאוחר יותר.' });
  }
};

export const currentUser = (req, res) => res.json({ user: publicUser(req.user) });
