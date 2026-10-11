import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, dbGet, dbRun, dbAll } from '../db/sqlite.js';
import { authService, hashPassword, verifyPassword, createJwt, verifyJwt } from '../services/authService.js';
import { actionPlanEngine } from '../services/actionPlanEngine.js';
import { learningEngine } from '../services/learningEngine.js';
import { scanEngine } from '../services/scanEngine.js';
import { requireAuth } from '../middleware/auth.js';

describe('Multi-Tenant SaaS Security & Data Isolation Test Suite', () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let testOppId: string;

  before(async () => {
    await initDatabase();

    // Create unique test users
    const timestamp = Date.now();
    const userAEmail = `user_a_${timestamp}@test.com`;
    const userBEmail = `user_b_${timestamp}@test.com`;

    const sessionA = await authService.signup({
      email: userAEmail,
      password: 'Password123!',
      name: 'User Alpha'
    });
    userA = { id: sessionA.user.id, email: sessionA.user.email, token: sessionA.token };

    const sessionB = await authService.signup({
      email: userBEmail,
      password: 'Password456!',
      name: 'User Beta'
    });
    userB = { id: sessionB.user.id, email: sessionB.user.email, token: sessionB.token };

    // Create a base opportunity for testing
    testOppId = `opp-test-${timestamp}`;
    await dbRun(`
      INSERT OR REPLACE INTO opportunities (
        id, user_id, title, summary, solution, service_type, target_customer, customer_type,
        workflow, required_tools, missing_skills, startup_cost, difficulty,
        time_to_demo, potential_monetization, risks, score, score_breakdown,
        confidence, saved, status
      ) VALUES (
        ?, ?, 'Test Multi-Tenant Opportunity', 'Summary for test opportunity',
        'Solution text', 'Consulting', 'Target Clients', 'B2B',
        '["Step 1", "Step 2"]', '["Tool A", "Tool B"]', '[]',
        0, 'Easy', '1 day', '₹10,000 / month', '[]', 85, '{}',
        'High', 0, 'new'
      );
    `, [testOppId, userA.id]);
  });

  describe('1. Authentication Service & Cryptographic Security', () => {
    it('hashes passwords using scrypt with unique salts', async () => {
      const pass = 'SuperSecret2026!';
      const hash1 = await hashPassword(pass);
      const hash2 = await hashPassword(pass);

      assert.notEqual(hash1.salt, hash2.salt, 'Salts must be unique per hash');
      assert.notEqual(hash1.hash, hash2.hash, 'Hashes must differ when salts differ');
      assert.equal(await verifyPassword(pass, hash1.hash, hash1.salt), true);
      assert.equal(await verifyPassword('WrongPassword', hash1.hash, hash1.salt), false);
    });

    it('rejects duplicate user signup with identical email', async () => {
      await assert.rejects(
        async () => {
          await authService.signup({
            email: userA.email,
            password: 'AnotherPassword!'
          });
        },
        /already exists/i
      );
    });

    it('authenticates valid credentials and rejects invalid credentials', async () => {
      const loginSuccess = await authService.login({
        email: userA.email,
        password: 'Password123!'
      });
      assert.ok(loginSuccess.token);
      assert.equal(loginSuccess.user.id, userA.id);

      await assert.rejects(
        async () => {
          await authService.login({
            email: userA.email,
            password: 'IncorrectPassword'
          });
        },
        /invalid email or password/i
      );
    });

    it('verifies signed JWT tokens and rejects tampered or forged tokens', () => {
      const token = createJwt({ userId: userA.id, email: userA.email }, 3600);
      const payload = verifyJwt(token);
      assert.equal(payload.userId, userA.id);
      assert.equal(payload.email, userA.email);

      // Tamper signature
      const tampered = token.slice(0, -5) + 'AAAAA';
      assert.throws(() => verifyJwt(tampered), /signature/i);

      // Malformed token
      assert.throws(() => verifyJwt('not.a.valid.jwt.token'), /malformed/i);
    });

    it('handles password reset flow securely', async () => {
      const resetReq = await authService.requestPasswordReset(userA.email);
      assert.ok(resetReq.resetToken);

      const resetRes = await authService.resetPassword({
        token: resetReq.resetToken!,
        newPassword: 'BrandNewPassword789!'
      });
      assert.equal(resetRes.success, true);

      // Old password must fail
      await assert.rejects(
        async () => {
          await authService.login({
            email: userA.email,
            password: 'Password123!'
          });
        },
        /invalid email or password/i
      );

      // New password must succeed
      const newLogin = await authService.login({
        email: userA.email,
        password: 'BrandNewPassword789!'
      });
      assert.equal(newLogin.user.id, userA.id);
    });
  });

  describe('2. User Profile Isolation', () => {
    it('keeps skills, tools, and profile settings isolated per tenant', async () => {
      const profARec = await dbGet<any>('SELECT id FROM profiles WHERE user_id = ?', [userA.id]);
      const profBRec = await dbGet<any>('SELECT id FROM profiles WHERE user_id = ?', [userB.id]);

      // Update profiles for both users
      await dbRun(
        `UPDATE profiles SET name = ?, bio = ?, available_hours_per_week = ?, preferred_budget = ? WHERE user_id = ?`,
        ['User Alpha Builder', 'Bio A', 15, 5000, userA.id]
      );
      await dbRun(
        `UPDATE profiles SET name = ?, bio = ?, available_hours_per_week = ?, preferred_budget = ? WHERE user_id = ?`,
        ['User Beta Builder', 'Bio B', 30, 20000, userB.id]
      );

      // Insert skills scoped by user_id using valid profile_id foreign keys
      await dbRun(
        `INSERT INTO skills (id, user_id, profile_id, name, proficiency) VALUES (?, ?, ?, ?, ?)`,
        [`skill-a-${Date.now()}`, userA.id, profARec.id, 'Copywriting', 'Expert']
      );
      await dbRun(
        `INSERT INTO skills (id, user_id, profile_id, name, proficiency) VALUES (?, ?, ?, ?, ?)`,
        [`skill-b-${Date.now()}`, userB.id, profBRec.id, 'Python', 'Intermediate']
      );

      // Verify User A only sees User A's profile & skills
      const profA = await dbGet<any>('SELECT * FROM profiles WHERE user_id = ?', [userA.id]);
      const skillsA = await dbAll<any>('SELECT * FROM skills WHERE user_id = ?', [userA.id]);
      assert.equal(profA.name, 'User Alpha Builder');
      assert.equal(skillsA.length, 1);
      assert.equal(skillsA[0].name, 'Copywriting');

      // Verify User B only sees User B's profile & skills
      const profB = await dbGet<any>('SELECT * FROM profiles WHERE user_id = ?', [userB.id]);
      const skillsB = await dbAll<any>('SELECT * FROM skills WHERE user_id = ?', [userB.id]);
      assert.equal(profB.name, 'User Beta Builder');
      assert.equal(skillsB.length, 1);
      assert.equal(skillsB[0].name, 'Python');

      // Verify cross-user leakage is impossible
      const crossCheck = skillsB.some(s => s.name === 'Copywriting');
      assert.equal(crossCheck, false, 'User B must not see User A skills');
    });
  });

  describe('3. Action Plans & Progress Tracking Isolation', () => {
    let planAId: string;
    let stepAId: string;

    it('generates action plans strictly scoped to the authenticated tenant', async () => {
      const plan = await actionPlanEngine.generatePlanForOpportunity(testOppId, undefined, userA.id);
      assert.ok(plan);
      assert.ok(plan.id);
      assert.ok(plan.steps.length > 0);
      planAId = plan.id;
      stepAId = plan.steps[0].id;

      // Verify plan record has user_id = userA.id
      const dbPlan = await dbGet<any>('SELECT user_id FROM action_plans WHERE id = ?', [planAId]);
      assert.equal(dbPlan.user_id, userA.id);
    });

    it('prevents User B from listing User A action plans', async () => {
      const plansB = await actionPlanEngine.getActionPlans({}, userB.id);
      const containsUserAPlan = plansB.some(p => p.id === planAId);
      assert.equal(containsUserAPlan, false, 'User B must not see User A action plans');
    });

    it('prevents User B from accessing User A action plan by direct ID', async () => {
      // Direct lookup with User B tenant scope must return null
      const plan = await actionPlanEngine.getActionPlanById(planAId, userB.id);
      assert.equal(plan, null, 'Direct lookup of other user plan must return null');

      // Lookup with User A must succeed
      const planA = await actionPlanEngine.getActionPlanById(planAId, userA.id);
      assert.ok(planA, 'Owner must be able to view their own plan');
    });

    it('prevents User B from modifying steps or status of User A plan', async () => {
      await assert.rejects(
        async () => {
          await actionPlanEngine.updateStep(stepAId, { status: 'completed' }, userB.id);
        },
        /Unauthorized/i
      );
    });

    it('prevents User B from deleting User A action plan', async () => {
      const deleted = await actionPlanEngine.deletePlan(planAId, userB.id);
      assert.equal(deleted, false, 'User B delete of User A plan must fail');

      // Verify plan still exists in DB
      const existing = await dbGet<any>('SELECT id FROM action_plans WHERE id = ?', [planAId]);
      assert.ok(existing, 'Plan must remain intact');
    });

    it('strictly isolates progress metrics and logs between tenants (ZERO cross-user leakage)', async () => {
      // User A logs real execution results
      await actionPlanEngine.logProgressResult({
        actionPlanId: planAId,
        resultType: 'demo_created',
        outcome: 'positive',
        numericValue: 3,
        notes: 'Created 3 interactive demos'
      }, userA.id);

      await actionPlanEngine.logProgressResult({
        actionPlanId: planAId,
        resultType: 'prospect_contacted',
        outcome: 'neutral',
        numericValue: 10,
        notes: 'Contacted 10 local prospects'
      }, userA.id);

      await actionPlanEngine.logProgressResult({
        actionPlanId: planAId,
        resultType: 'revenue_earned',
        outcome: 'positive',
        numericValue: 15000,
        notes: 'First client retainer'
      }, userA.id);

      // Verify User A metrics reflect User A results
      const metricsA = await actionPlanEngine.getProgressMetrics(userA.id);
      assert.equal(metricsA.demos_created, 3);
      assert.equal(metricsA.prospects_contacted, 10);
      assert.equal(metricsA.revenue_earned, 15000);

      // CRITICAL CHECK: User B metrics must be strictly ZERO (no leakage from User A)
      const metricsB = await actionPlanEngine.getProgressMetrics(userB.id);
      assert.equal(metricsB.demos_created, 0, 'User B must see 0 demos');
      assert.equal(metricsB.prospects_contacted, 0, 'User B must see 0 prospects');
      assert.equal(metricsB.revenue_earned, 0, 'User B must see 0 revenue');

      // User B logs their own single result
      await actionPlanEngine.logProgressResult({
        resultType: 'demo_created',
        outcome: 'positive',
        numericValue: 1,
        notes: 'User B single prototype'
      }, userB.id);

      const metricsBUpdated = await actionPlanEngine.getProgressMetrics(userB.id);
      assert.equal(metricsBUpdated.demos_created, 1);
      assert.equal(metricsBUpdated.revenue_earned, 0);

      // User A metrics must remain completely unaffected by User B
      const metricsARecheck = await actionPlanEngine.getProgressMetrics(userA.id);
      assert.equal(metricsARecheck.demos_created, 3);
      assert.equal(metricsARecheck.revenue_earned, 15000);
    });
  });

  describe('4. Learning Engine & Feedback Isolation', () => {
    it('isolates user feedback and personalized learning signals per tenant', async () => {
      // User A submits feedback
      await learningEngine.recordFeedback({
        sourceType: 'opportunity',
        sourceId: testOppId,
        rating: 'useful',
        reason: 'Fits my schedule',
        comments: 'Great match'
      }, userA.id);

      // User A feedback list contains the record
      const feedbackA = await learningEngine.getFeedback({}, userA.id);
      assert.ok(feedbackA.some(f => f.source_id === testOppId));

      // User B feedback list must NOT contain User A feedback
      const feedbackB = await learningEngine.getFeedback({}, userB.id);
      assert.equal(feedbackB.some(f => f.source_id === testOppId), false);

      // User B learning profile must contain only User B's own demo signal (1) and zero signals from User A
      const profileB = await learningEngine.getLearningProfile(userB.id);
      assert.equal(profileB.total_signals, 1, 'User B profile must contain only their own 1 demo signal');

      // Verify User B learning signals do not contain User A's feedback
      const signalsB = await learningEngine.getLearningSignals({}, userB.id);
      assert.equal(signalsB.some(s => s.source_id === testOppId), false, 'User B must not have User A feedback signal');
    });
  });

  describe('5. Legacy Data Preservation & Isolation', () => {
    it('preserves existing legacy owner account (user-default-legacy) without leaking to new users', async () => {
      const legacyOwner = await dbGet<any>('SELECT * FROM users WHERE id = "user-default-legacy";');
      assert.ok(legacyOwner, 'Legacy owner user must exist');
      assert.equal(legacyOwner.email, 'owner@opportunityos.local');

      // Verify legacy plans are owned by user-default-legacy
      const legacyPlans = await dbAll<any>('SELECT id FROM action_plans WHERE user_id = "user-default-legacy";');
      assert.ok(legacyPlans.length > 0, 'Legacy plans must be preserved');

      // Verify User B cannot access legacy owner plans
      for (const lp of legacyPlans.slice(0, 3)) {
        const check = await actionPlanEngine.getActionPlanById(lp.id, userB.id);
        assert.equal(check, null, 'User B must not have access to legacy owner plan');
      }
    });
  });

  describe('6. API Middleware Authentication Enforcement', () => {
    it('returns 401 when Authorization header is missing', () => {
      let status = 0;
      let body: any = null;
      const req: any = { headers: {} };
      const res: any = {
        status: (s: number) => { status = s; return res; },
        json: (b: any) => { body = b; return res; }
      };
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });
      assert.equal(status, 401);
      assert.match(body.error, /Authentication required/i);
      assert.equal(nextCalled, false);
    });

    it('returns 401 when Authorization header format is malformed', () => {
      let status = 0;
      const req: any = { headers: { authorization: 'Basic 12345' } };
      const res: any = {
        status: (s: number) => { status = s; return res; },
        json: () => res
      };
      requireAuth(req, res, () => {});
      assert.equal(status, 401);
    });

    it('returns 401 when Bearer token is invalid or forged', () => {
      let status = 0;
      const req: any = { headers: { authorization: 'Bearer forged.token.payload' } };
      const res: any = {
        status: (s: number) => { status = s; return res; },
        json: () => res
      };
      requireAuth(req, res, () => {});
      assert.equal(status, 401);
    });

    it('attaches req.user and passes next() on valid Bearer token', () => {
      const validToken = createJwt({ userId: userA.id, email: userA.email }, 3600);
      const req: any = { headers: { authorization: `Bearer ${validToken}` } };
      const res: any = {};
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req.user.userId, userA.id);
      assert.equal(req.user.email, userA.email);
    });
  });
});
