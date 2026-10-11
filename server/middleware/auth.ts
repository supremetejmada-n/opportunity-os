import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../services/authService.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}

/**
 * Express middleware that enforces authentication and tenant identity.
 * Rejects unauthenticated requests with 401 Unauthorized.
 * NEVER trusts client-supplied query or body IDs for user identity.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization format. Expected: Bearer <token>' });
    return;
  }

  const token = parts[1];
  try {
    const payload = verifyJwt(token);
    req.user = {
      userId: payload.userId,
      email: payload.email
    };
    req.userId = payload.userId;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired session token.', details: err?.message });
    return;
  }
}

/**
 * Optional authentication middleware for public endpoints that can optionally personalize data
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const payload = verifyJwt(parts[1]);
      req.user = {
        userId: payload.userId,
        email: payload.email
      };
      req.userId = payload.userId;
    } catch {
      // Ignore invalid token on optional auth
    }
  }
  next();
}
