import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDatabase, dbGet, dbRun, dbAll } from '../db/sqlite.js';
import { authService } from '../services/authService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { requireSubscription } from '../middleware/subscription.js';

describe('Opportunity OS — Subscription & 3-Day Free Trial Test Suite', () => {
  let userTrial: { id: string; email: string; token: string };
  let userExpired: { id: string; email: string; token: string };
  let userPaid: { id: string; email: string; token: string };
  let userAttacker: { id: string; email: string; token: string };

  const TEST_SECRET = 'test_razorpay_mock_secret_key_32bytes';
  const TEST_WEBHOOK_SECRET = 'test_razorpay_webhook_secret_key';

  before(async () => {
    await initDatabase();

    const timestamp = Date.now();

    // 1. User with active trial
    const sessionTrial = await authService.signup({
      email: `sub_trial_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Trial User'
    });
    userTrial = { id: sessionTrial.user.id, email: sessionTrial.user.email, token: sessionTrial.token };

    // 2. User whose trial will be expired
    const sessionExpired = await authService.signup({
      email: `sub_expired_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Expired User'
    });
    userExpired = { id: sessionExpired.user.id, email: sessionExpired.user.email, token: sessionExpired.token };

    // 3. User to test payment flow
    const sessionPaid = await authService.signup({
      email: `sub_paid_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Paid User'
    });
    userPaid = { id: sessionPaid.user.id, email: sessionPaid.user.email, token: sessionPaid.token };

    // 4. Attacker user for isolation tests
    const sessionAttacker = await authService.signup({
      email: `sub_attacker_${timestamp}@test.com`,
      password: 'StrongPassword123!',
      name: 'Attacker User'
    });
    userAttacker = { id: sessionAttacker.user.id, email: sessionAttacker.user.email, token: sessionAttacker.token };
  });

  describe('1. Registration & Automatic 3-Day Trial Provisioning', () => {
    it('automatically provisions a 3-day full-access free trial on account registration', async () => {
      const sub = await subscriptionService.getSubscription(userTrial.id);
      assert.ok(sub, 'Subscription record must exist for new user');
      assert.equal(sub.user_id, userTrial.id);
      assert.equal(sub.status, 'trialing');
      assert.equal(sub.amount_paise, 800, 'Price must be 800 paise (₹8)');
      assert.equal(sub.currency, 'INR');
      assert.equal(sub.billing_provider, 'razorpay');
      assert.ok(sub.trial_started_at, 'Trial start timestamp must be set');
      assert.ok(sub.trial_expires_at, 'Trial expiry timestamp must be set');

      const startTime = new Date(sub.trial_started_at!).getTime();
      const expireTime = new Date(sub.trial_expires_at!).getTime();
      const diffMs = expireTime - startTime;
      const expectedMs = 3 * 24 * 60 * 60 * 1000; // Exactly 3 days

      assert.ok(Math.abs(diffMs - expectedMs) < 1000, 'Trial duration must be 3 days (72 hours)');
    });

    it('confirms new trial user is fully entitled with no payment details provided', async () => {
      const entitlement = await subscriptionService.getEntitlement(userTrial.id);
      assert.equal(entitlement.isEntitled, true, 'Trial user must be entitled');
      assert.equal(entitlement.status, 'trialing');
      assert.equal(entitlement.trial.isExpired, false);
      assert.ok(entitlement.trial.remainingSeconds > 0);
      assert.equal(entitlement.plan.priceInr, 8);
      assert.equal(entitlement.plan.amountPaise, 800);
      assert.equal(entitlement.plan.currency, 'INR');
    });

    it('allows access to protected routes via requireSubscription middleware during trial', async () => {
      let nextCalled = false;
      const req: any = { user: { userId: userTrial.id, email: userTrial.email } };
      const res: any = {
        status: () => res,
        json: () => res
      };

      await requireSubscription(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true, 'Middleware must call next() for unexpired trial user');
    });
  });

  describe('2. Trial Expiry & Gate Protection', () => {
    it('evaluates entitlement as false once trial timestamp expires', async () => {
      // Simulate trial expiration by backdating trial_expires_at by 1 hour
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      await dbRun(
        'UPDATE subscriptions SET trial_expires_at = ?, status = "trialing" WHERE user_id = ?',
        [pastDate, userExpired.id]
      );

      const entitlement = await subscriptionService.getEntitlement(userExpired.id);
      assert.equal(entitlement.isEntitled, false, 'Expired user must NOT be entitled');
      assert.equal(entitlement.status, 'expired', 'Status must transition to expired');
      assert.equal(entitlement.trial.isExpired, true);
      assert.equal(entitlement.trial.remainingSeconds, 0);
    });

    it('rejects protected route access with HTTP 403 and SUBSCRIPTION_EXPIRED error code', async () => {
      let statusCode = 0;
      let responseBody: any = null;
      let nextCalled = false;

      const req: any = { user: { userId: userExpired.id, email: userExpired.email } };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseBody = data;
          return res;
        }
      };

      await requireSubscription(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false, 'Middleware must NOT call next() for expired user');
      assert.equal(statusCode, 403, 'Must return HTTP 403 Forbidden');
      assert.equal(responseBody.code, 'SUBSCRIPTION_EXPIRED');
      assert.equal(responseBody.trialExpired, true);
      assert.equal(responseBody.plan.priceInr, 8);
      assert.match(responseBody.message, /₹8\/month/i);
    });

    it('preserves all user data and saved items when trial expires (Zero Data Loss)', async () => {
      // Create a saved opportunity and action plan for expired user
      const oppId = `opp_preservation_${Date.now()}`;
      await dbRun(`
        INSERT INTO opportunities (
          id, user_id, title, summary, solution, service_type, customer_type, target_customer,
          workflow, required_tools, missing_skills, startup_cost, difficulty,
          time_to_demo, potential_monetization, risks, score, score_breakdown, confidence, saved, status
        ) VALUES (
          ?, ?, 'Preserved Opportunity Title', 'Summary', 'Solution', 'Micro-SaaS', 'B2B', 'Tech Founders',
          '[]', '[]', '[]', 0, 'Easy', '1 day', '₹50,000', '[]', 95, '{}', 'High', 1, 'active'
        )
      `, [oppId, userExpired.id]);

      // Check opportunity exists in DB
      const opp = await dbGet<any>('SELECT * FROM opportunities WHERE id = ? AND user_id = ?', [oppId, userExpired.id]);
      assert.ok(opp, 'User opportunity must be preserved despite expired trial');
      assert.equal(opp.title, 'Preserved Opportunity Title');

      // User profile is preserved
      const profile = await dbGet<any>('SELECT * FROM profiles WHERE user_id = ?', [userExpired.id]);
      assert.ok(profile, 'User profile must be preserved');
    });

    it('does NOT reset or extend trial when user logs in again', async () => {
      // User logs in again
      const loginRes = await authService.login({
        email: userExpired.email,
        password: 'StrongPassword123!'
      });
      assert.ok(loginRes.token, 'Login must succeed');

      // Check entitlement is still expired
      const entitlement = await subscriptionService.getEntitlement(userExpired.id);
      assert.equal(entitlement.isEntitled, false, 'Logging in must NOT reset expired trial');
      assert.equal(entitlement.status, 'expired');
    });
  });

  describe('3. Order Creation & Razorpay Integration (₹8 / Month)', () => {
    it('creates a payment order for exactly ₹8 (800 paise INR)', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);

      assert.ok(order.orderId, 'Must return valid orderId');
      assert.match(order.orderId, /^order_/, 'OrderId must begin with order_ prefix');
      assert.equal(order.amountPaise, 800, 'Must be 800 paise');
      assert.equal(order.currency, 'INR');
      assert.equal(order.planName, 'Opportunity OS Pro');

      // Verify transaction recorded in SQLite
      const tx = await dbGet<any>(
        'SELECT * FROM payment_transactions WHERE provider_order_id = ?',
        [order.orderId]
      );
      assert.ok(tx, 'Transaction must be recorded in payment_transactions table');
      assert.equal(tx.user_id, userPaid.id);
      assert.equal(tx.amount_paise, 800);
      assert.equal(tx.currency, 'INR');
      assert.equal(tx.status, 'created');
    });
  });

  describe('4. Cryptographic Payment Verification & HMAC-SHA256 Signatures', () => {
    it('verifies valid HMAC-SHA256 signature and upgrades user to active 30-day Pro plan', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_${Date.now()}`;

      // Generate authentic HMAC-SHA256 signature using test secret
      const payload = `${order.orderId}|${paymentId}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      const result = await subscriptionService.verifyPayment(userPaid.id, {
        orderId: order.orderId,
        paymentId: paymentId,
        signature: validSignature
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'active');

      // Verify subscription record updated
      const sub = await subscriptionService.getSubscription(userPaid.id);
      assert.ok(sub);
      assert.equal(sub.status, 'active');
      assert.equal(sub.provider_payment_id, paymentId);
      assert.ok(sub.current_period_end);

      const periodEnd = new Date(sub.current_period_end!).getTime();
      const now = Date.now();
      const approx30Days = 30 * 24 * 60 * 60 * 1000;
      assert.ok(periodEnd > now, 'Period end must be in future');
      assert.ok(Math.abs(periodEnd - now - approx30Days) < 60000, 'Period end must be ~30 days');

      // Verify transaction marked as paid
      const tx = await dbGet<any>(
        'SELECT * FROM payment_transactions WHERE provider_order_id = ?',
        [order.orderId]
      );
      assert.equal(tx.status, 'paid');
      assert.equal(tx.provider_payment_id, paymentId);
      assert.equal(tx.provider_signature, validSignature);

      // Verify user is now entitled
      const entitlement = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(entitlement.isEntitled, true);
      assert.equal(entitlement.status, 'active');
    });

    it('strictly rejects forged or tampered HMAC signatures and does not grant access', async () => {
      const order = await subscriptionService.createPaymentOrder(userExpired.id);
      const paymentId = `pay_tampered_${Date.now()}`;
      const fakeSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

      await assert.rejects(
        async () => {
          await subscriptionService.verifyPayment(userExpired.id, {
            orderId: order.orderId,
            paymentId: paymentId,
            signature: fakeSignature
          });
        },
        /Payment verification failed/i
      );

      // Verify user remains unentitled
      const entitlement = await subscriptionService.getEntitlement(userExpired.id);
      assert.equal(entitlement.isEntitled, false, 'Forged payment must NOT grant entitlement');
      assert.equal(entitlement.status, 'expired');

      // Verify transaction marked as failed
      const tx = await dbGet<any>(
        'SELECT * FROM payment_transactions WHERE provider_order_id = ?',
        [order.orderId]
      );
      assert.equal(tx.status, 'failed');
    });
  });

  describe('5. Webhook Processing & Idempotency', () => {
    it('processes payment.captured webhook with valid x-razorpay-signature', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_hook_${Date.now()}`;

      const webhookBody = {
        id: `evt_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: order.orderId,
              amount: 800,
              currency: 'INR',
              status: 'captured',
              notes: {
                userId: userPaid.id
              }
            }
          }
        }
      };

      const rawBody = JSON.stringify(webhookBody);
      const webhookSignature = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(rawBody).digest('hex');

      const result = await subscriptionService.processWebhook(rawBody, webhookSignature);
      assert.equal(result.handled, true);
      assert.match(result.message, /Payment captured/i);
    });

    it('rejects webhook with invalid signature', async () => {
      const invalidSignature = 'invalid_webhook_signature_hex';
      const webhookBody = JSON.stringify({ event: 'payment.captured', payload: {} });

      await assert.rejects(
        async () => {
          await subscriptionService.processWebhook(webhookBody, invalidSignature);
        },
        /Invalid webhook signature/i
      );
    });

    it('enforces idempotency on duplicate webhook deliveries without double-crediting', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_idempotent_${Date.now()}`;

      const webhookBody = {
        id: `evt_idem_${Date.now()}`,
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: order.orderId,
              amount: 800,
              currency: 'INR',
              status: 'paid'
            }
          },
          payment: {
            entity: {
              id: paymentId,
              order_id: order.orderId,
              status: 'captured',
              notes: {
                userId: userPaid.id
              }
            }
          }
        }
      };

      const rawBody = JSON.stringify(webhookBody);
      const webhookSignature = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(rawBody).digest('hex');

      // First webhook delivery
      const res1 = await subscriptionService.processWebhook(rawBody, webhookSignature);
      assert.equal(res1.handled, true);

      // Second (duplicate) webhook delivery
      const res2 = await subscriptionService.processWebhook(rawBody, webhookSignature);
      assert.equal(res2.handled, true);
      assert.match(res2.message, /already processed idempotently/i);

      // Confirm only one paid transaction exists for this order
      const txs = await dbAll<any>(
        'SELECT * FROM payment_transactions WHERE provider_order_id = ? AND status = "paid"',
        [order.orderId]
      );
      assert.equal(txs.length, 1, 'Duplicate webhook must not create redundant transaction records');
    });
  });

  describe('6. Multi-Tenant Cross-User Isolation in Subscriptions', () => {
    it('prevents User B from accessing User A payment transactions', async () => {
      const userATransactions = await subscriptionService.listTransactions(userPaid.id);
      assert.ok(userATransactions.length > 0, 'User A has transactions');

      const attackerTransactions = await subscriptionService.listTransactions(userAttacker.id);
      // Ensure User A transactions are not in Attacker transactions
      for (const aTx of userATransactions) {
        assert.equal(
          attackerTransactions.some(t => t.id === aTx.id),
          false,
          'User B must NOT see User A transactions'
        );
      }
    });

    it('prevents User B from verifying a payment order created by User A', async () => {
      const orderA = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_exploit_${Date.now()}`;
      const payload = `${orderA.orderId}|${paymentId}`;
      const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      // Attacker tries to verify User A's order to credit their own account
      await assert.rejects(
        async () => {
          await subscriptionService.verifyPayment(userAttacker.id, {
            orderId: orderA.orderId,
            paymentId: paymentId,
            signature: validSignature
          });
        },
        /no matching payment order found for this user/i
      );
    });
  });

  describe('7. Subscription Cancellation Flow', () => {
    it('cancels renewal while keeping entitlement active until current_period_end', async () => {
      const cancelRes = await subscriptionService.cancelSubscription(userPaid.id);
      assert.equal(cancelRes.success, true);
      assert.equal(cancelRes.cancelAtPeriodEnd, true);

      const sub = await subscriptionService.getSubscription(userPaid.id);
      assert.equal(sub?.cancel_at_period_end, 1);

      const entitlement = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(entitlement.isEntitled, true, 'Must remain entitled until current_period_end');
      assert.equal(entitlement.cancelAtPeriodEnd, true);
    });
  });

  describe('8. Concurrency, Race Condition Resilience & Period Rollover', () => {
    it('handles concurrent payment verification requests idempotently without double-extension', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_concurrent_${Date.now()}`;
      const payload = `${order.orderId}|${paymentId}`;
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      // Fire 5 concurrent verifyPayment calls simultaneously
      const results = await Promise.all([
        subscriptionService.verifyPayment(userPaid.id, { orderId: order.orderId, paymentId, signature }),
        subscriptionService.verifyPayment(userPaid.id, { orderId: order.orderId, paymentId, signature }),
        subscriptionService.verifyPayment(userPaid.id, { orderId: order.orderId, paymentId, signature }),
        subscriptionService.verifyPayment(userPaid.id, { orderId: order.orderId, paymentId, signature }),
        subscriptionService.verifyPayment(userPaid.id, { orderId: order.orderId, paymentId, signature })
      ]);

      // All 5 calls must successfully return active state
      for (const res of results) {
        assert.equal(res.success, true);
        assert.equal(res.status, 'active');
      }

      // Check payment_transactions table has exactly 1 paid transaction for this order
      const txs = await dbAll<any>(
        'SELECT * FROM payment_transactions WHERE provider_order_id = ? AND status = "paid";',
        [order.orderId]
      );
      assert.equal(txs.length, 1, 'Concurrent requests must result in exactly 1 paid transaction record');
    });

    it('rolls over and extends remaining active time by 30 days on renewal', async () => {
      // Simulate an active user who already has 10 days remaining
      const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      await dbRun(
        'UPDATE subscriptions SET status = "active", current_period_end = ? WHERE user_id = ?;',
        [tenDaysFromNow, userPaid.id]
      );

      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_rollover_${Date.now()}`;
      const payload = `${order.orderId}|${paymentId}`;
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      await subscriptionService.verifyPayment(userPaid.id, {
        orderId: order.orderId,
        paymentId,
        signature
      });

      const updatedSub = await subscriptionService.getSubscription(userPaid.id);
      assert.ok(updatedSub?.current_period_end);

      const newEndMs = new Date(updatedSub.current_period_end!).getTime();
      const expectedEndMs = new Date(tenDaysFromNow).getTime() + 30 * 24 * 60 * 60 * 1000;
      assert.ok(Math.abs(newEndMs - expectedEndMs) < 2000, 'Renewal must extend 30 days from existing period end');
    });
  });

  describe('9. Amount & Currency Integrity Enforcement', () => {
    it('strictly rejects payment verification if amount or currency is tampered in transaction record', async () => {
      const order = await subscriptionService.createPaymentOrder(userPaid.id);
      const paymentId = `pay_tamper_${Date.now()}`;
      const payload = `${order.orderId}|${paymentId}`;
      const signature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');

      // Tamper amount in database to 100 paise (₹1)
      await dbRun(
        'UPDATE payment_transactions SET amount_paise = 100 WHERE provider_order_id = ?;',
        [order.orderId]
      );

      await assert.rejects(
        async () => {
          await subscriptionService.verifyPayment(userPaid.id, {
            orderId: order.orderId,
            paymentId,
            signature
          });
        },
        /Invalid transaction amount: expected 800 paise/i
      );

      // Restore to 800 paise but tamper currency to USD
      await dbRun(
        'UPDATE payment_transactions SET amount_paise = 800, currency = "USD" WHERE provider_order_id = ?;',
        [order.orderId]
      );

      await assert.rejects(
        async () => {
          await subscriptionService.verifyPayment(userPaid.id, {
            orderId: order.orderId,
            paymentId,
            signature
          });
        },
        /Invalid transaction currency: expected INR/i
      );
    });

    it('rejects webhooks with incorrect currency or amount', async () => {
      const badAmountPayload = {
        id: `evt_bad_amt_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_bad_amt_${Date.now()}`,
              order_id: `order_fake_${Date.now()}`,
              amount: 100, // Expected 800
              currency: 'INR',
              status: 'captured'
            }
          }
        }
      };

      const rawBody = JSON.stringify(badAmountPayload);
      const signature = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(rawBody).digest('hex');

      await assert.rejects(
        async () => {
          await subscriptionService.processWebhook(rawBody, signature);
        },
        /Webhook payment amount mismatch/i
      );
    });
  });

  describe('10. Production Environment Hardening & Mock Order Rejection', () => {
    it('strictly forbids creating mock orders in production when live keys are missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.RAZORPAY_KEY_ID;
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;

        await assert.rejects(
          async () => {
            await subscriptionService.createPaymentOrder(userPaid.id);
          },
          /Razorpay payment gateway credentials must be configured on production server/i
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalKey) process.env.RAZORPAY_KEY_ID = originalKey;
        if (originalSecret) process.env.RAZORPAY_KEY_SECRET = originalSecret;
      }
    });

    it('strictly forbids payment verification in production when live keys are missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.RAZORPAY_KEY_ID;
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;

        await assert.rejects(
          async () => {
            await subscriptionService.verifyPayment(userPaid.id, {
              orderId: 'order_test_fake',
              paymentId: 'pay_test_fake',
              signature: 'sig_fake'
            });
          },
          /Payment gateway credentials not configured on production server/i
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalKey) process.env.RAZORPAY_KEY_ID = originalKey;
        if (originalSecret) process.env.RAZORPAY_KEY_SECRET = originalSecret;
      }
    });
  });

  describe('11. Complete Subscription State Matrix & Access Boundaries', () => {
    it('confirms pending_payment and past_due states strictly deny entitlement', async () => {
      // Test pending_payment
      await dbRun('UPDATE subscriptions SET status = "pending_payment" WHERE user_id = ?;', [userPaid.id]);
      const resPending = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(resPending.isEntitled, false);
      assert.equal(resPending.status, 'pending_payment');

      // Test past_due
      await dbRun('UPDATE subscriptions SET status = "past_due" WHERE user_id = ?;', [userPaid.id]);
      const resPastDue = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(resPastDue.isEntitled, false);
      assert.equal(resPastDue.status, 'past_due');
    });

    it('confirms expired paid period strictly denies entitlement and updates status', async () => {
      // Backdate current_period_end to 1 hour ago
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      await dbRun(
        'UPDATE subscriptions SET status = "active", current_period_end = ? WHERE user_id = ?;',
        [oneHourAgo, userPaid.id]
      );

      const resExpired = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(resExpired.isEntitled, false);
      assert.equal(resExpired.status, 'expired');

      // Verify DB row status was transitioned to expired
      const dbSub = await subscriptionService.getSubscription(userPaid.id);
      assert.equal(dbSub?.status, 'expired');
    });

    it('confirms expired cancelled subscription strictly denies entitlement', async () => {
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      await dbRun(
        'UPDATE subscriptions SET status = "cancelled", current_period_end = ? WHERE user_id = ?;',
        [oneHourAgo, userPaid.id]
      );

      const resCancelledExpired = await subscriptionService.getEntitlement(userPaid.id);
      assert.equal(resCancelledExpired.isEntitled, false);
      assert.equal(resCancelledExpired.status, 'expired');
    });
  });
});
