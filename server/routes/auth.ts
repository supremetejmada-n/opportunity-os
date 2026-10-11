import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { dbGet } from '../db/sqlite.js';

export const authRouter = Router();

// Rate limiters for authentication endpoints
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  skipInTesting: true
});

const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many account registrations from this IP. Please try again later.',
  skipInTesting: true
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
  skipInTesting: true
});

// POST /api/auth/signup — Register new user account
authRouter.post('/signup', signupLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body || {};
    const session = await authService.signup({ email, password, name });
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: session.user,
      token: session.token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to sign up.' });
  }
});

// POST /api/auth/login — Authenticate user
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const session = await authService.login({ email, password });
    res.json({
      success: true,
      message: 'Login successful.',
      user: session.user,
      token: session.token
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid credentials.' });
  }
});

// GET /api/auth/me — Get authenticated user details & profile
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const profile = await dbGet<any>('SELECT * FROM profiles WHERE user_id = ?;', [userId]);
    res.json({
      user,
      profile: profile || null
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve current user session.' });
  }
});

// POST /api/auth/logout — Invalidate/clear session
authRouter.post('/logout', (_req: Request, res: Response) => {
  // Stateless JWT logout: client discards token
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/forgot-password — Request password reset token
authRouter.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to request password reset.' });
  }
});

// POST /api/auth/reset-password — Complete password reset
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body || {};
    const result = await authService.resetPassword({ token, newPassword });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reset password.' });
  }
});
