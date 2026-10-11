import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDatabase, dbGet, dbRun, dbAll } from '../db/sqlite.js';
import { authService, hashPassword, createJwt, verifyJwt } from '../services/authService.js';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { opportunityEngine } from '../services/opportunityEngine.js';
import { learningEngine } from '../services/learningEngine.js';
import { getUserProfileContext } from '../services/discovery/relevanceGate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

describe('Opportunity OS — Pre-Deployment Security Gate Verification', () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let userAPlanId: string;
  let userAStepId: string;
  let userAOppId: string;

  before(async () => {
    await initDatabase();

    const timestamp = Date.now();
    const emailA = `sec_alpha_${timestamp}@security-gate.test`;
    const emailB = `sec_beta_${timestamp}@security-gate.test`;

    const sessionA = await authService.signup({
      email: emailA,
      password: 'StrongPassword123!',
      name: 'Security User Alpha'
    });
    userA = { id: sessionA.user.id, email: sessionA.user.email, token: sessionA.token };

    const sessionB = await authService.signup({
      email: emailB,
      password: 'StrongPassword123!',
      name: 'Security User Beta'
    });
    userB = { id: sessionB.user.id, email: sessionB.user.email, token: sessionB.token };

    // Setup private assets for User A
    userAOppId = `opp_userA_${timestamp}`;
    await dbRun(`
      INSERT INTO opportunities (
        id, user_id, title, summary, solution, service_type, customer_type, target_customer,
        workflow, required_tools, missing_skills, startup_cost, difficulty,
        time_to_demo, potential_monetization, risks, score, score_breakdown, confidence, saved, status
      ) VALUES (
        ?, ?, 'User A Private Enterprise Pipeline', 'Confidential workflow', 'Custom solution', 'Enterprise', 'CTO', 'CTO',
        '["Step 1", "Step 2"]', '["Python", "PrivateLLM"]', '[]', 0, 'Medium', '2 days', '₹100,000', '[]', 90, '{}', 'High', 1, 'active'
      )
    `, [userAOppId, userA.id]);

    const plan = await actionPlanEngine.generatePlanForOpportunity(userAOppId, undefined, userA.id);
    userAPlanId = plan.id;
    userAStepId = plan.steps[0].id;

    // Log progress for User A
    await actionPlanEngine.logProgressResult({
      actionPlanId: userAPlanId,
      stepId: userAStepId,
      resultType: 'revenue_earned',
      numericValue: 50000,
      notes: 'User A confidential contract closed',
      outcome: 'positive'
    }, userA.id);

    // Record feedback for User A
    await learningEngine.recordFeedback({
      sourceType: 'opportunity',
      sourceId: userAOppId,
      rating: 'useful',
      comments: 'Private user feedback from Alpha'
    }, userA.id);
  });

  // =========================================================================
  // GATE 1: Legacy Account Safety & Unauthenticated Protection
  // =========================================================================
  describe('Gate 1: Legacy Account Safety & Public Boundary', () => {
    it('protects legacy owner account with hashed credentials in users table', async () => {
      const legacyUser = await dbGet<any>('SELECT * FROM users WHERE id = "user-default-legacy"');
      assert.ok(legacyUser, 'Legacy user must exist in database');
      assert.ok(legacyUser.password_hash, 'Password hash must be present');
      assert.ok(legacyUser.salt, 'Unique salt must be present');
      assert.notEqual(legacyUser.password_hash, 'OpportunityOS!2026', 'Password hash must NOT be stored in plaintext');
    });

    it('rejects unauthenticated requests to protected endpoints via middleware', () => {
      let status = 0;
      let responseBody: any = null;
      let nextCalled = false;

      const mockRes: any = {
        status: (s: number) => { status = s; return mockRes; },
        json: (b: any) => { responseBody = b; return mockRes; }
      };

      // 1. Missing header
      requireAuth({ headers: {} } as any, mockRes, () => { nextCalled = true; });
      assert.equal(status, 401);
      assert.match(responseBody.error, /Authentication required/i);
      assert.equal(nextCalled, false);

      // 2. Malformed scheme (Basic instead of Bearer)
      status = 0;
      requireAuth({ headers: { authorization: 'Basic dXNlcjpwYXNz' } } as any, mockRes, () => { nextCalled = true; });
      assert.equal(status, 401);
      assert.match(responseBody.error, /Invalid authorization format/i);
    });

    it('returns empty neutral profile context for unauthenticated visitors in relevanceGate', async () => {
      const neutralContext = await getUserProfileContext(undefined);
      assert.equal(neutralContext.isIncompleteProfile, true);
      assert.equal(neutralContext.skills.length, 0);
      assert.equal(neutralContext.tools.length, 0);
      assert.equal(neutralContext.goals.length, 0);
      assert.equal(neutralContext.interests.length, 0);
      assert.equal(neutralContext.projects.length, 0);
    });
  });

  // =========================================================================
  // GATE 2: Cryptographic Authentication, Algorithm Allowlist & Token Partition
  // =========================================================================
  describe('Gate 2: Cryptographic Authentication & JWT Hardening', () => {
    it('verifies valid internal JWT with HS256 signature and proper claims', () => {
      const token = createJwt({ userId: userA.id, email: userA.email });
      const payload = verifyJwt(token);
      assert.equal(payload.userId, userA.id);
      assert.equal(payload.email, userA.email);
      assert.equal(payload.iss, 'opportunity-os');
      assert.equal(payload.aud, 'opportunity-os-client');
      assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    });

    it('strictly rejects tokens with unauthorized algorithms (e.g. none attack)', () => {
      // Craft forged JWT with alg: "none"
      const headerNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: 'attacker', email: 'hacker@test.com', exp: 9999999999 })).toString('base64url');
      const forgedToken = `${headerNone}.${payload}.`;

      assert.throws(() => {
        verifyJwt(forgedToken);
      }, /Unauthorized algorithm/i);
    });

    it('strictly rejects tokens with forged HMAC signatures', () => {
      const validToken = createJwt({ userId: userA.id, email: userA.email });
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered_signature_payload_12345`;

      assert.throws(() => {
        verifyJwt(tamperedToken);
      }, /Invalid token signature/i);
    });

    it('strictly rejects expired tokens', () => {
      // Create token expired 10 seconds ago
      const expiredToken = createJwt({ userId: userA.id, email: userA.email }, -10);
      assert.throws(() => {
        verifyJwt(expiredToken);
      }, /Token has expired/i);
    });

    it('enforces password reset token hashing and single-use invalidation', async () => {
      const resetResult = await authService.requestPasswordReset(userA.email);
      assert.ok(resetResult.success);

      // Verify token in DB is hashed using SHA-256
      const userRecord = await dbGet<any>('SELECT reset_token FROM users WHERE id = ?', [userA.id]);
      assert.ok(userRecord.reset_token, 'Reset token hash must be saved in database');
      assert.equal(userRecord.reset_token.length, 64, 'Token must be stored as 64-char SHA-256 hex hash');

      if (resetResult.resetToken) {
        const tokenPlain = resetResult.resetToken;
        const expectedHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');
        assert.equal(userRecord.reset_token, expectedHash, 'DB must store SHA-256 hash of token, not plaintext');

        // Execute reset
        const updateResult = await authService.resetPassword({
          token: tokenPlain,
          newPassword: 'BrandNewSecurePassword456!'
        });
        assert.ok(updateResult.success);

        // Verify single-use: token in DB is cleared
        const clearedUser = await dbGet<any>('SELECT reset_token FROM users WHERE id = ?', [userA.id]);
        assert.equal(clearedUser.reset_token, null, 'Reset token must be wiped after single use');

        // Attempting to reuse same token must fail
        await assert.rejects(async () => {
          await authService.resetPassword({
            token: tokenPlain,
            newPassword: 'AnotherPassword789!'
          });
        }, /Invalid or expired password reset token/i);

        // Authenticate with new password
        const loginSession = await authService.login({
          email: userA.email,
          password: 'BrandNewSecurePassword456!'
        });
        assert.ok(loginSession.token);
      }
    });

    it('enforces rate limiting on repeated requests', () => {
      const testLimiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
        message: 'Rate limit exceeded'
      });

      let hitCount = 0;
      let blocked = false;
      const mockReq: any = { ip: '192.168.1.100', path: '/test-rate-limit' };
      const mockRes: any = {
        setHeader: () => {},
        status: (code: number) => {
          if (code === 429) blocked = true;
          return mockRes;
        },
        json: () => mockRes
      };

      for (let i = 0; i < 5; i++) {
        testLimiter(mockReq, mockRes, () => { hitCount++; });
      }

      assert.equal(hitCount, 3, 'Should allow exactly 3 requests');
      assert.equal(blocked, true, 'Subsequent requests must receive HTTP 429');
    });
  });

  // =========================================================================
  // GATE 3: Multi-Tenant Data Isolation (User A vs. User B)
  // =========================================================================
  describe('Gate 3: Multi-Tenant Data Isolation & Direct ID Protection', () => {
    it('guarantees fresh user accounts NEVER inherit legacy or foreign profile data', async () => {
      const userBProfile = await opportunityEngine.getFullUserProfile(userB.id);
      assert.equal(userBProfile.profile.user_id, userB.id);
      assert.equal(userBProfile.skills.length, 0, 'User B must not inherit any skills from legacy user');
      assert.equal(userBProfile.tools.length, 0, 'User B must not inherit any tools from legacy user');
      assert.equal(userBProfile.goals.length, 0, 'User B must not inherit any goals from legacy user');
      assert.equal(userBProfile.interests.length, 0, 'User B must not inherit any interests from legacy user');
      assert.equal(userBProfile.projects.length, 0, 'User B must not inherit any projects from legacy user');
    });

    it('prevents User B from querying User A private opportunity by direct ID', async () => {
      const unauthorizedQuery = await opportunityEngine.getOpportunityById(userAOppId, userB.id);
      assert.equal(unauthorizedQuery, null, 'User B must receive null when querying User A opportunity ID');

      const authorizedQuery = await opportunityEngine.getOpportunityById(userAOppId, userA.id);
      assert.ok(authorizedQuery, 'User A must successfully query own opportunity');
      assert.equal(authorizedQuery.id, userAOppId);
    });

    it('prevents User B from querying User A action plan by direct ID', async () => {
      const unauthorizedPlan = await actionPlanEngine.getActionPlanById(userAPlanId, userB.id);
      assert.equal(unauthorizedPlan, null, 'User B must receive null for User A plan ID');

      const authorizedPlan = await actionPlanEngine.getActionPlanById(userAPlanId, userA.id);
      assert.ok(authorizedPlan, 'User A must successfully query own plan');
      assert.equal(authorizedPlan.id, userAPlanId);
    });

    it('prevents User B from mutating User A action step status or notes', async () => {
      await assert.rejects(async () => {
        await actionPlanEngine.updateStep(userAStepId, { status: 'completed', notes: 'Hacked by User B' }, userB.id);
      }, /(?:Unauthorized|Step not found)/i);

      // Verify User A step remains unmodified
      const planA = await actionPlanEngine.getActionPlanById(userAPlanId, userA.id);
      const stepA = planA!.steps.find(s => s.id === userAStepId);
      assert.notEqual(stepA?.notes, 'Hacked by User B', 'Step must not be altered by unauthorized tenant');
    });

    it('prevents User B from deleting User A action plan', async () => {
      const deleteResult = await actionPlanEngine.deletePlan(userAPlanId, userB.id);
      assert.equal(deleteResult, false, 'User B delete attempt must return false');

      // Verify User A plan still exists in database
      const planA = await actionPlanEngine.getActionPlanById(userAPlanId, userA.id);
      assert.ok(planA, 'User A plan must remain intact');
    });

    it('strictly isolates progress metrics: User A revenue does NOT leak into User B metrics', async () => {
      const metricsB = await actionPlanEngine.getProgressMetrics(userB.id);
      assert.equal(metricsB.revenue_earned, 0, 'User B revenue metric must be strictly 0');
      assert.equal(metricsB.demos_created, 0);
      assert.equal(metricsB.prospects_contacted, 0);
      assert.equal(metricsB.clients_acquired, 0);

      const metricsA = await actionPlanEngine.getProgressMetrics(userA.id);
      assert.equal(metricsA.revenue_earned, 50000, 'User A revenue metric must reflect logged ₹50,000');
    });

    it('strictly isolates progress activity logs between tenants', async () => {
      const logsB = await actionPlanEngine.getProgressLogs(undefined, userB.id);
      assert.equal(logsB.length, 0, 'User B must have 0 activity logs');

      const logsA = await actionPlanEngine.getProgressLogs(undefined, userA.id);
      assert.ok(logsA.length >= 1, 'User A must see own activity logs');
      assert.equal(logsA[0].numeric_value, 50000);
    });

    it('strictly isolates user feedback records between tenants', async () => {
      const feedbackB = await learningEngine.getFeedback(undefined, userB.id);
      assert.equal(feedbackB.length, 0, 'User B must see 0 feedback entries');

      const feedbackA = await learningEngine.getFeedback(undefined, userA.id);
      assert.ok(feedbackA.length >= 1, 'User A must see own feedback');
      assert.equal(feedbackA[0].comments, 'Private user feedback from Alpha');
    });

    it('strictly isolates learning profiles and preference rebuilds', async () => {
      await learningEngine.rebuildLearningProfile(userB.id);
      const profileB = await learningEngine.getLearningProfile(userB.id);
      assert.equal(profileB.total_signals, 0, 'User B profile must have 0 signals');

      const profileA = await learningEngine.getLearningProfile(userA.id);
      assert.ok(profileA.total_signals >= 1, 'User A profile must reflect own signals');
    });
  });
});
