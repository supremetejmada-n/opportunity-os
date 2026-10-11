import crypto from 'crypto';
import { dbGet, dbRun } from '../db/sqlite.js';
import { emailService } from './emailService.js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  sub?: string;
  iss?: string;
  aud?: string;
  role?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be set to a cryptographically secure random string (minimum 32 characters) in production.'); })()
    : 'opportunity_os_saas_production_jwt_secret_2026'
);
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ALLOWED_ALGORITHMS = ['HS256'];

// Helper for Base64URL encoding/decoding
function base64UrlEncode(str: string | Buffer): string {
  const buf = Buffer.isBuffer(str) ? str : Buffer.from(str);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return Buffer.from(b64, 'base64').toString('utf-8');
}

/**
 * Derives cryptographic key using scrypt
 */
export function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  return new Promise((resolve, reject) => {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ hash: derivedKey.toString('hex'), salt });
    });
  });
}

/**
 * Timing-safe password verification
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates an HMAC-SHA256 JWT
 */
export function createJwt(payload: { userId: string; email: string }, expiresInSeconds = TOKEN_EXPIRY_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    userId: payload.userId,
    email: payload.email,
    sub: payload.userId,
    iss: 'opportunity-os',
    aud: 'opportunity-os-client',
    iat: now,
    exp: now + expiresInSeconds
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${data}.${encodedSignature}`;
}

/**
 * Verifies an HMAC-SHA256 JWT using strict algorithm allowlisting and isolated provider paths
 */
export function verifyJwt(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token: incorrect segment count');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  // 1. Strict Header & Algorithm Allowlist Verification
  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
  } catch {
    throw new Error('Malformed token: invalid header JSON');
  }

  if (!header.alg || !ALLOWED_ALGORITHMS.includes(header.alg)) {
    throw new Error(`Unauthorized algorithm: '${header.alg}'. Only HS256 is permitted.`);
  }

  if (header.typ && header.typ !== 'JWT') {
    throw new Error(`Invalid token type: '${header.typ}'`);
  }

  // 2. Decode payload for provider routing & claims validation
  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Malformed token: invalid payload JSON');
  }

  const providedSigBuf = Buffer.from(encodedSignature);

  // 3. Strict Provider Isolation: Supabase Auth vs Internal Opportunity OS
  const isSupabaseToken = SUPABASE_JWT_SECRET && (payload.aud === 'authenticated' || (payload.iss && payload.iss.includes('supabase')));
  let isValid = false;

  if (isSupabaseToken) {
    // Isolated Supabase JWT validation path
    const expectedSigSupabase = base64UrlEncode(crypto.createHmac('sha256', SUPABASE_JWT_SECRET!).update(data).digest());
    const supabaseSigBuf = Buffer.from(expectedSigSupabase);
    if (providedSigBuf.length === supabaseSigBuf.length && crypto.timingSafeEqual(providedSigBuf, supabaseSigBuf)) {
      isValid = true;
    }
  } else {
    // Isolated Internal Opportunity OS validation path
    const expectedSigInternal = base64UrlEncode(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
    const internalSigBuf = Buffer.from(expectedSigInternal);
    if (providedSigBuf.length === internalSigBuf.length && crypto.timingSafeEqual(providedSigBuf, internalSigBuf)) {
      isValid = true;
    }
  }

  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  // 4. Expiry validation
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('Token has expired');
  }

  // Normalize user ID
  if (!payload.userId && payload.sub) {
    payload.userId = payload.sub;
  }

  return payload;
}

export class AuthService {
  /**
   * Register a new user and initialize a private profile
   */
  async signup(params: { email: string; password: string; name?: string }): Promise<AuthSession> {
    const email = (params.email || '').trim().toLowerCase();
    const password = params.password || '';
    const name = (params.name || '').trim() || email.split('@')[0];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Please provide a valid email address.');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // Check if user already exists
    const existing = await dbGet<any>('SELECT id FROM users WHERE LOWER(email) = ?', [email]);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const { hash, salt } = await hashPassword(password);
    const userId = `user_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hash, salt, name, now, now]
    );

    // Create an initial private profile for the new user
    const profileId = `profile_${userId}`;
    await dbRun(
      `INSERT INTO profiles (id, user_id, name, title, bio, preferred_budget, available_hours_per_week, preferred_work_type, disliked_work, remote_preference, learning_tolerance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 20, 'Freelance', '', 'Remote Only', 'High', ?, ?)`,
      [profileId, userId, name, 'Independent Creator', 'Getting started with AI opportunities', now, now]
    );

    // Provision 3-day full-access free trial immediately (no payment details required)
    const subId = `sub_${userId}`;
    const trialStart = now;
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, amount_paise, currency, status, trial_started_at, trial_expires_at, created_at, updated_at)
       VALUES (?, ?, 'monthly_tier_8', 'Opportunity OS Pro', 800, 'INR', 'trialing', ?, ?, ?, ?)`,
      [subId, userId, trialStart, trialExpires, now, now]
    );

    const user: AuthUser = { id: userId, email, name, created_at: now };
    const token = createJwt({ userId, email });

    return { user, token };
  }

  /**
   * Authenticate existing user with credentials
   */
  async login(params: { email: string; password: string }): Promise<AuthSession> {
    const email = (params.email || '').trim().toLowerCase();
    const password = params.password || '';

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const row = await dbGet<any>('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
    if (!row) {
      throw new Error('Invalid email or password.');
    }

    const valid = await verifyPassword(password, row.password_hash, row.salt);
    if (!valid) {
      throw new Error('Invalid email or password.');
    }

    const user: AuthUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at
    };

    const token = createJwt({ userId: row.id, email: row.email });
    return { user, token };
  }

  /**
   * Retrieve user metadata by user ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const row = await dbGet<any>('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId]);
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at
    };
  }

  /**
   * Request password reset token
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await dbGet<any>('SELECT id, email, name FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    
    // Always return generic success message to prevent user enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with that email, a password reset link has been generated.'
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await dbRun(
      'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tokenHash, expires, user.id]
    );

    // Send transactional password reset email
    await emailService.sendPasswordResetEmail({
      to: user.email,
      resetToken,
      name: user.name
    });

    const isProduction = process.env.NODE_ENV === 'production';
    return {
      success: true,
      message: 'If an account exists with that email, a password reset link has been generated.',
      // In production, reset token is never returned via API to prevent account takeover
      ...(isProduction ? {} : { resetToken })
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(params: { token: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    const { token, newPassword } = params;
    if (!token) throw new Error('Reset token is required.');
    if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters long.');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date().toISOString();
    const user = await dbGet<any>(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [tokenHash, now]
    );

    if (!user) {
      throw new Error('Invalid or expired password reset token.');
    }

    const { hash, salt } = await hashPassword(newPassword);
    await dbRun(
      `UPDATE users SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ? WHERE id = ?`,
      [hash, salt, now, user.id]
    );

    return { success: true, message: 'Password has been updated successfully. You can now log in.' };
  }
}

export const authService = new AuthService();
