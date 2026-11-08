import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  currentUser,
  resetPassword,
  googleConfig,
  verifyGoogle,
  loginWithGoogle,
  linkGoogle,
} from '../controllers/userController.js';
import { requireAuth } from '../auth.js';
import { rateLimit } from '../rateLimit.js';

const router = express.Router();

router.post('/register', rateLimit({ limit: 20 }), registerUser);
router.post('/login', rateLimit({ limit: 30 }), loginUser);
router.get('/google/config', googleConfig);
router.post('/google', rateLimit({ limit: 30 }), verifyGoogle, loginWithGoogle);
router.post('/google/link', rateLimit({ limit: 15 }), requireAuth, verifyGoogle, linkGoogle);
router.post('/forgot-password', rateLimit({ limit: 5 }), forgotPassword);
router.post('/reset-password', rateLimit({ limit: 10 }), resetPassword);
router.get('/me', requireAuth, currentUser);

export default router;
