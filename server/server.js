import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import recipesRoutes from './routes/recipes.js';
import userRoutes from './routes/userRoutes.js';
import communityRoutes from './routes/community.js';
import pantryRoutes from './routes/pantry.js';
import libraryRoutes from './routes/library.js';
import { publicFrontend } from './publicFrontend.js';
import { requireTrustedOrigin } from './requestOrigin.js';
import Session from './models/Session.js';
import LoginAttempt from './models/LoginAttempt.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(directory, '.env') });

const PORT = process.env.PORT || 5001;
const netlifyOrigin = publicFrontend();
const origins = [
  process.env.APP_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.CLIENT_URL,
  netlifyOrigin,
  ...(!process.env.RENDER ? ['http://localhost:3002', 'http://127.0.0.1:3002'] : []),
].filter(Boolean);
const app = express();
app.disable('x-powered-by');
if (process.env.RENDER) app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  if (req.path.startsWith('/api/users')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(
  cors({
    origin: origins,
  })
);
app.use('/api', requireTrustedOrigin(origins));

app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

// Routes
app.use('/api/recipes', recipesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/pantry', pantryRoutes);
app.use('/api/library', libraryRoutes);
app.get('/api/health', (req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ ok: mongoose.connection.readyState === 1 })
);
app.use('/api', (req, res) => res.status(404).json({ message: 'הכתובת לא נמצאה' }));

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.resolve(directory, '../client/dist');
  app.use(express.static(clientPath, { index: false }));
  app.get('*', (req, res) => {
    if (process.env.RENDER && netlifyOrigin) {
      return res.redirect(302, new URL(netlifyOrigin).origin + req.originalUrl);
    }
    return res.sendFile(path.join(clientPath, 'index.html'));
  });
}
app.use((error, req, res, next) => {
  res
    .status(error.status === 413 ? 413 : error instanceof SyntaxError ? 400 : 500)
    .json({ message: 'הבקשה לא תקינה או שאירעה שגיאה בשרת' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => Promise.all([Session.init(), LoginAttempt.init()]))
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('connected to mongoDB & listening on port', PORT);
    });
  })
  .catch(() => {
    console.error('Unable to connect to MongoDB. Check MONGO_URI and Atlas network access.');
    process.exitCode = 1;
  });
