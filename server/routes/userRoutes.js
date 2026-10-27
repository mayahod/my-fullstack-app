// server/routes/userRoutes.js
import express from 'express';
import { registerUser, loginUser, forgotPassword, currentUser, resetPassword } from '../controllers/userController.js';
import { requireAuth } from '../auth.js';
import { rateLimit } from '../rateLimit.js';

const router = express.Router();

router.post('/register', rateLimit({ limit: 20 }), registerUser);
router.post('/login', rateLimit({ limit: 30 }), loginUser);
router.post('/forgot-password', rateLimit({ limit: 5 }), forgotPassword);
router.post('/reset-password', rateLimit({ limit: 10 }), resetPassword);
router.get('/me', requireAuth, currentUser);

export default router;
