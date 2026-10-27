import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { mailConfigured, publicAppUrl, sendPasswordResetEmail } from '../services/mail.js';

import { getSecret, publicUser } from '../auth.js';
const normalizedEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

export const registerUser = async (req, res) => {
  try {
    const firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
    const lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
    const email = normalizedEmail(req.body.email);
    const password = req.body.password;
    if (!firstName || firstName.length > 100 || lastName.length > 100 || !validEmail(email)) {
      return res.status(400).json({ message: 'נא להזין שם פרטי ואימייל תקינים' });
    }
    if (typeof password !== 'string' || password.trim().length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'הסיסמה צריכה להכיל לפחות 8 תווים ועד 72 בתים' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: 'משתמש עם האימייל הזה כבר קיים' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'משתמש עם האימייל הזה כבר קיים' });
    res.status(500).json({ message: 'שגיאה בשרת, נסו שוב מאוחר יותר' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = normalizedEmail(req.body.email);
    const password = req.body.password;
    if (!validEmail(email) || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'נא להזין אימייל וסיסמה תקינים' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'האימייל או הסיסמה שגויים' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'האימייל או הסיסמה שגויים' });

    const token = jwt.sign({ id: user._id.toString(), version: user.passwordVersion || 0 }, getSecret(), { expiresIn: '2h', algorithm: 'HS256' });

    res
      .status(200)
      .json({ token, user: publicUser(user) });
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
    const message = 'אם קיים חשבון עם האימייל הזה, יישלח אליו קישור לאיפוס סיסמה. הקישור תקף ל־30 דקות.';
    const rawToken = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const user = await User.findOneAndUpdate({ email, $or: [{ resetRequestedAt: { $exists: false } }, { resetRequestedAt: { $lt: new Date(Date.now() - 60000) } }] },
      { $set: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + 30 * 60000), resetRequestedAt: now } }, { new: true });
    if (!user) return res.json({ message });
    try {
      const resetUrl = `${publicAppUrl()}/reset-password#token=${rawToken}`;
      await mailer({ to: user.email, resetUrl });
    } catch {
      await User.updateOne({ _id: user._id, resetTokenHash: hash }, { $unset: { resetTokenHash: '', resetTokenExpires: '', resetRequestedAt: '' } });
      return res.status(503).json({ message: 'שליחת המייל נכשלה. נסו שוב מאוחר יותר.' });
    }
    return res.json({ message });
  } catch (e) {
    return res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'הקישור אינו תקין או שפג תוקפו. בקשו קישור חדש.' });
  if (typeof password !== 'string' || password.trim().length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'הסיסמה צריכה להכיל לפחות 8 תווים ועד 72 בתים' });
  }
  try {
    const hash = createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } },
      { $set: { password: passwordHash }, $inc: { passwordVersion: 1 }, $unset: { resetTokenHash: '', resetTokenExpires: '', resetRequestedAt: '' } });
    if (!user) return res.status(400).json({ message: 'הקישור אינו תקין או שפג תוקפו. בקשו קישור חדש.' });
    return res.json({ message: 'הסיסמה עודכנה בהצלחה. כעת אפשר להתחבר עם הסיסמה החדשה.' });
  } catch { return res.status(500).json({ message: 'שגיאה בשרת. נסו שוב מאוחר יותר.' }); }
};

export const currentUser = (req, res) => res.json({ user: publicUser(req.user) });
