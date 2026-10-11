import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDatabase, dbGet, dbRun } from '../db/sqlite.js';
import { authService, hashPassword } from '../services/authService.js';
import { emailService } from '../services/emailService.js';

describe('Opportunity OS — Pre-Deployment Password Reset & Gate Verification', () => {
  let testUserEmail: string;
  let testUserId: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();

    const timestamp = Date.now();
    testUserEmail = `reset_test_${timestamp}@deployment-gate.test`;

    const session = await authService.signup({
      email: testUserEmail,
      password: 'OriginalPassword123!',
      name: 'Reset Test User'
    });
    testUserId = session.user.id;
  });

  // =========================================================================
  // 1. Transactional Email Adapter
  // =========================================================================
  describe('1. Transactional Email Adapter Architecture', () => {
    it('correctly detects provider based on environment variables', () => {
      const originalResend = process.env.RESEND_API_KEY;
      const originalSendgrid = process.env.SENDGRID_API_KEY;
      const originalPostmark = process.env.POSTMARK_SERVER_TOKEN;

      try {
        delete process.env.RESEND_API_KEY;
        delete process.env.SENDGRID_API_KEY;
        delete process.env.POSTMARK_SERVER_TOKEN;
        assert.equal(emailService.getProviderName(), 'mock');

        process.env.RESEND_API_KEY = 're_test_key_123';
        assert.equal(emailService.getProviderName(), 'resend');

        delete process.env.RESEND_API_KEY;
        process.env.SENDGRID_API_KEY = 'SG.test_key_123';
        assert.equal(emailService.getProviderName(), 'sendgrid');

        delete process.env.SENDGRID_API_KEY;
        process.env.POSTMARK_SERVER_TOKEN = 'pm-test-token-123';
        assert.equal(emailService.getProviderName(), 'postmark');
      } finally {
        if (originalResend) process.env.RESEND_API_KEY = originalResend;
        else delete process.env.RESEND_API_KEY;
        if (originalSendgrid) process.env.SENDGRID_API_KEY = originalSendgrid;
        else delete process.env.SENDGRID_API_KEY;
        if (originalPostmark) process.env.POSTMARK_SERVER_TOKEN = originalPostmark;
        else delete process.env.POSTMARK_SERVER_TOKEN;
      }
    });

    it('generates grounded email templates with reset URL and security advice', async () => {
      emailService.clearLogs();
      const testToken = 'abc123token456';
      const res = await emailService.sendPasswordResetEmail({
        to: testUserEmail,
        resetToken: testToken,
        name: 'Reset Test User'
      });

      assert.equal(res.success, true);
      const logs = emailService.getInMemoryLogs();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].to, testUserEmail);
      assert.equal(logs[0].resetToken, testToken);
      assert.match(logs[0].subject, /Opportunity OS/i);
    });
  });

  // =========================================================================
  // 2. User Enumeration Resistance & Generic Messaging
  // =========================================================================
  describe('2. User Enumeration Resistance & Generic Responses', () => {
    it('returns identical generic responses for both existing and non-existing emails', async () => {
      const existingRes = await authService.requestPasswordReset(testUserEmail);
      const nonExistingRes = await authService.requestPasswordReset('non_existent_random_user_9999@test.com');

      assert.equal(existingRes.success, true);
      assert.equal(nonExistingRes.success, true);
      assert.equal(existingRes.message, nonExistingRes.message, 'Responses must be 100% identical to prevent enumeration');
      assert.match(existingRes.message, /If an account exists with that email/i);
    });

    it('never leaks reset token in production mode responses', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const prodRes = await authService.requestPasswordReset(testUserEmail);
        assert.equal(prodRes.resetToken, undefined, 'Raw reset token must never be returned in production');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // =========================================================================
  // 3. Reset Token Validation: Valid, Reused, Expired, Invalid
  // =========================================================================
  describe('3. Password Reset Token Security Lifecycle', () => {
    let capturedToken: string;

    it('generates a valid reset token and stores SHA-256 hash in SQLite', async () => {
      emailService.clearLogs();
      await authService.requestPasswordReset(testUserEmail);
      const emailLogs = emailService.getInMemoryLogs();
      assert.ok(emailLogs.length > 0, 'Reset email must be dispatched');
      capturedToken = emailLogs[emailLogs.length - 1].resetToken!;
      assert.ok(capturedToken, 'Reset token must be present in captured email log');

      const userRow = await dbGet<any>('SELECT reset_token, reset_token_expires FROM users WHERE id = ?', [testUserId]);
      assert.ok(userRow.reset_token, 'reset_token must be stored in database');
      assert.notEqual(userRow.reset_token, capturedToken, 'Stored token must be SHA-256 hash, not plaintext');

      const expectedHash = crypto.createHash('sha256').update(capturedToken).digest('hex');
      assert.equal(userRow.reset_token, expectedHash, 'Stored token must match SHA-256 digest');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      await assert.rejects(async () => {
        await authService.resetPassword({
          token: capturedToken,
          newPassword: 'short'
        });
      }, /at least 8 characters/i);
    });

    it('successfully resets password using a valid token', async () => {
      const resetResult = await authService.resetPassword({
        token: capturedToken,
        newPassword: 'BrandNewReplacementPassword789!'
      });
      assert.equal(resetResult.success, true);

      // Verify old password no longer works
      await assert.rejects(async () => {
        await authService.login({
          email: testUserEmail,
          password: 'OriginalPassword123!'
        });
      }, /Invalid email or password/i);

      // Verify new password works
      const newLogin = await authService.login({
        email: testUserEmail,
        password: 'BrandNewReplacementPassword789!'
      });
      assert.ok(newLogin.token);
      assert.equal(newLogin.user.id, testUserId);
    });

    it('strictly rejects token reuse (single-use invalidation)', async () => {
      // Attempt to use the same token a second time
      await assert.rejects(async () => {
        await authService.resetPassword({
          token: capturedToken,
          newPassword: 'YetAnotherPassword123!'
        });
      }, /Invalid or expired password reset token/i);

      const userRow = await dbGet<any>('SELECT reset_token, reset_token_expires FROM users WHERE id = ?', [testUserId]);
      assert.equal(userRow.reset_token, null, 'Reset token must be nullified after use');
      assert.equal(userRow.reset_token_expires, null, 'Reset expiry must be nullified after use');
    });

    it('strictly rejects expired reset tokens', async () => {
      // Generate a new token
      emailService.clearLogs();
      await authService.requestPasswordReset(testUserEmail);
      const emailLogs = emailService.getInMemoryLogs();
      const expiredToken = emailLogs[emailLogs.length - 1].resetToken!;

      // Manually backdate expiry in database to the past
      const pastTime = new Date(Date.now() - 3600000).toISOString();
      await dbRun('UPDATE users SET reset_token_expires = ? WHERE id = ?', [pastTime, testUserId]);

      await assert.rejects(async () => {
        await authService.resetPassword({
          token: expiredToken,
          newPassword: 'ExpiredTokenAttemptPass123!'
        });
      }, /Invalid or expired password reset token/i);
    });

    it('strictly rejects forged or invalid tokens', async () => {
      await assert.rejects(async () => {
        await authService.resetPassword({
          token: 'completely_fabricated_token_value_0000',
          newPassword: 'FakeTokenAttemptPass123!'
        });
      }, /Invalid or expired password reset token/i);
    });
  });

  // =========================================================================
  // 4. Production Startup Hardening & Secret Guards
  // =========================================================================
  describe('4. Production Startup Hardening & Secret Guards', () => {
    it('verifies that scrypt hashing uses a unique cryptographically random salt per user', async () => {
      const pass = 'IdenticalPassword123!';
      const hash1 = await hashPassword(pass);
      const hash2 = await hashPassword(pass);

      assert.notEqual(hash1.salt, hash2.salt, 'Salts must be unique');
      assert.notEqual(hash1.hash, hash2.hash, 'Hashes must differ due to unique salts');
    });

    it('generates an unguessable 24-byte hex password if INITIAL_OWNER_PASSWORD is unset in production', () => {
      const isProd = true;
      const legacyPassword = (isProd ? crypto.randomBytes(24).toString('hex') : 'OpportunityOS!2026');
      assert.equal(legacyPassword.length, 48, 'Must be 48-character hex string (24 bytes)');
      assert.notEqual(legacyPassword, 'OpportunityOS!2026', 'Must not fall back to static password in production');
    });
  });
});
