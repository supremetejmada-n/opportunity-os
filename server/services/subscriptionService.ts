import crypto from 'crypto';
import { dbGet, dbRun, dbAll } from '../db/sqlite.js';

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  amount_paise: number;
  currency: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending_payment';
  trial_started_at: string | null;
  trial_expires_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  cancelled_at: string | null;
  billing_provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_payment_id: string | null;
  provider_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransactionRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  provider_order_id: string;
  provider_payment_id: string | null;
  provider_signature: string | null;
  amount_paise: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  error_code: string | null;
  error_description: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntitlementResult {
  hasSubscription: boolean;
  isEntitled: boolean;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending_payment';
  plan: {
    id: string;
    name: string;
    priceInr: number;
    amountPaise: number;
    currency: string;
    interval: string;
  };
  trial: {
    startedAt: string | null;
    expiresAt: string | null;
    remainingSeconds: number;
    remainingDays: number;
    remainingFormatted: string;
    isEndingSoon: boolean;
    isExpired: boolean;
  };
  currentPeriod: {
    start: string | null;
    end: string | null;
  };
  cancelAtPeriodEnd: boolean;
  razorpay: {
    isConfigured: boolean;
    keyId: string | null;
  };
  subscription: SubscriptionRecord | null;
}

const PLAN_CONFIG = {
  id: 'monthly_tier_8',
  name: 'Opportunity OS Pro',
  priceInr: 8,
  amountPaise: 800, // ₹8 = 800 paise
  currency: 'INR',
  interval: 'month',
  trialDurationMs: 3 * 24 * 60 * 60 * 1000, // 3 days (72 hours)
  paidDurationMs: 30 * 24 * 60 * 60 * 1000 // 30 days
};

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export class SubscriptionService {
  /**
   * Check if Razorpay keys are configured in environment
   */
  isRazorpayConfigured(): boolean {
    return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  /**
   * Get Razorpay secret key (or test secret in non-production)
   */
  private getRazorpaySecret(): string | null {
    if (process.env.RAZORPAY_KEY_SECRET) return process.env.RAZORPAY_KEY_SECRET;
    if (process.env.NODE_ENV !== 'production') {
      return process.env.TEST_RAZORPAY_SECRET || 'test_razorpay_mock_secret_key_32bytes';
    }
    return null;
  }

  /**
   * Get Razorpay webhook secret (or test webhook secret in non-production)
   */
  private getWebhookSecret(): string | null {
    if (process.env.RAZORPAY_WEBHOOK_SECRET) return process.env.RAZORPAY_WEBHOOK_SECRET;
    if (process.env.NODE_ENV !== 'production') {
      return process.env.TEST_RAZORPAY_WEBHOOK_SECRET || 'test_razorpay_webhook_secret_key';
    }
    return null;
  }

  /**
   * Retrieve raw subscription record from SQLite
   */
  async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    if (!userId) return null;
    const row = await dbGet<SubscriptionRecord>(
      'SELECT * FROM subscriptions WHERE user_id = ? LIMIT 1;',
      [userId]
    );
    return row || null;
  }

  /**
   * Evaluate full entitlement status for user based on server-side timestamps
   */
  async getEntitlement(userId: string): Promise<EntitlementResult> {
    const defaultPlan = {
      id: PLAN_CONFIG.id,
      name: PLAN_CONFIG.name,
      priceInr: PLAN_CONFIG.priceInr,
      amountPaise: PLAN_CONFIG.amountPaise,
      currency: PLAN_CONFIG.currency,
      interval: PLAN_CONFIG.interval
    };

    const razorpayInfo = {
      isConfigured: this.isRazorpayConfigured(),
      keyId: process.env.RAZORPAY_KEY_ID || null
    };

    const sub = await this.getSubscription(userId);

    if (!sub) {
      return {
        hasSubscription: false,
        isEntitled: false,
        status: 'expired',
        plan: defaultPlan,
        trial: {
          startedAt: null,
          expiresAt: null,
          remainingSeconds: 0,
          remainingDays: 0,
          remainingFormatted: '0 hours left',
          isEndingSoon: false,
          isExpired: true
        },
        currentPeriod: { start: null, end: null },
        cancelAtPeriodEnd: false,
        razorpay: razorpayInfo,
        subscription: null
      };
    }

    const now = Date.now();
    let currentStatus = sub.status;
    let isEntitled = false;

    // Evaluate active status
    if (currentStatus === 'active') {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
      if (periodEnd > now) {
        isEntitled = true;
      } else {
        currentStatus = 'expired';
        await dbRun('UPDATE subscriptions SET status = "expired", updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [sub.id]);
      }
    }

    // Evaluate trialing status
    const trialExpiry = sub.trial_expires_at ? new Date(sub.trial_expires_at).getTime() : 0;
    const trialRemainingMs = Math.max(0, trialExpiry - now);
    const remainingSeconds = Math.floor(trialRemainingMs / 1000);
    const remainingHours = Math.floor(remainingSeconds / 3600);
    const remainingDays = Math.floor(remainingHours / 24);

    let remainingFormatted = '0 hours left';
    if (remainingDays >= 1) {
      const remHours = remainingHours % 24;
      remainingFormatted = `${remainingDays}d ${remHours}h left`;
    } else if (remainingHours >= 1) {
      const remMins = Math.floor((remainingSeconds % 3600) / 60);
      remainingFormatted = `${remainingHours}h ${remMins}m left`;
    } else if (remainingSeconds > 0) {
      const remMins = Math.floor(remainingSeconds / 60);
      remainingFormatted = `${remMins}m left`;
    }

    const isEndingSoon = remainingSeconds > 0 && remainingSeconds <= 24 * 3600; // Less than 24h
    const isTrialExpired = remainingSeconds <= 0;

    if (currentStatus === 'trialing') {
      if (!isTrialExpired) {
        isEntitled = true;
      } else {
        currentStatus = 'expired';
        await dbRun('UPDATE subscriptions SET status = "expired", updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [sub.id]);
      }
    }

    // Evaluate cancelled status (paid until period end)
    if (currentStatus === 'cancelled') {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
      if (periodEnd > now) {
        isEntitled = true;
      } else {
        currentStatus = 'expired';
      }
    }

    return {
      hasSubscription: true,
      isEntitled,
      status: currentStatus,
      plan: defaultPlan,
      trial: {
        startedAt: sub.trial_started_at,
        expiresAt: sub.trial_expires_at,
        remainingSeconds,
        remainingDays,
        remainingFormatted,
        isEndingSoon,
        isExpired: isTrialExpired
      },
      currentPeriod: {
        start: sub.current_period_start,
        end: sub.current_period_end
      },
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      razorpay: razorpayInfo,
      subscription: sub
    };
  }

  /**
   * Create Razorpay payment order for ₹8 (800 paise)
   */
  async createPaymentOrder(userId: string): Promise<{
    orderId: string;
    amountPaise: number;
    currency: string;
    keyId: string | null;
    isLive: boolean;
    planName: string;
    description: string;
  }> {
    const user = await dbGet<any>('SELECT id, email, name FROM users WHERE id = ?;', [userId]);
    if (!user) throw new Error('User account not found.');

    const sub = await this.getSubscription(userId);
    const amountPaise = PLAN_CONFIG.amountPaise; // 800 paise = ₹8
    const currency = PLAN_CONFIG.currency;

    let orderId: string;
    const isLive = this.isRazorpayConfigured();

    if (isLive) {
      const keyId = process.env.RAZORPAY_KEY_ID!;
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
          notes: {
            userId,
            planId: PLAN_CONFIG.id
          }
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson as any)?.error?.description || `Razorpay order creation failed (${res.status})`);
      }

      const data = await res.json() as any;
      orderId = data.id;
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Razorpay payment gateway credentials must be configured on production server.');
      }
      // Deterministic order generator when credentials not yet set (or in test environment)
      orderId = `order_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }

    // Persist transaction record
    const txId = `tx_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO payment_transactions (id, user_id, subscription_id, provider, provider_order_id, amount_paise, currency, status, created_at, updated_at)
       VALUES (?, ?, ?, 'razorpay', ?, ?, ?, 'created', ?, ?);`,
      [txId, userId, sub?.id || null, orderId, amountPaise, currency, now, now]
    );

    return {
      orderId,
      amountPaise,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID || null,
      isLive,
      planName: PLAN_CONFIG.name,
      description: 'Opportunity OS Pro Subscription (1 Month • ₹8)'
    };
  }

  /**
   * Verify Razorpay payment signature and activate 30-day paid subscription
   */
  async verifyPayment(userId: string, data: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<{ success: boolean; status: string; current_period_end: string; message: string }> {
    const { orderId, paymentId, signature } = data;
    if (!orderId || !paymentId || !signature) {
      throw new Error('Order ID, Payment ID, and Signature are required for payment verification.');
    }

    if (process.env.NODE_ENV === 'production' && !this.isRazorpayConfigured()) {
      throw new Error('Payment gateway credentials not configured on production server.');
    }

    // Look up transaction by order ID and authenticated user ID
    const tx = await dbGet<PaymentTransactionRecord>(
      'SELECT * FROM payment_transactions WHERE provider_order_id = ? AND user_id = ? LIMIT 1;',
      [orderId, userId]
    );
    if (!tx) {
      throw new Error('Invalid order: no matching payment order found for this user.');
    }

    // Verify amount and currency on transaction
    if (tx.amount_paise !== PLAN_CONFIG.amountPaise) {
      throw new Error(`Invalid transaction amount: expected ${PLAN_CONFIG.amountPaise} paise, got ${tx.amount_paise}.`);
    }
    if (tx.currency !== PLAN_CONFIG.currency) {
      throw new Error(`Invalid transaction currency: expected ${PLAN_CONFIG.currency}, got ${tx.currency}.`);
    }

    // Idempotency: If order was already paid, return existing success state immediately
    if (tx.status === 'paid') {
      const sub = await this.getSubscription(userId);
      return {
        success: true,
        status: 'active',
        current_period_end: sub?.current_period_end || new Date().toISOString(),
        message: 'Payment was already processed successfully.'
      };
    }

    // Server-side payment status validation with live Razorpay gateway if configured
    if (this.isRazorpayConfigured()) {
      const keyId = process.env.RAZORPAY_KEY_ID!;
      const keySecret = process.env.RAZORPAY_KEY_SECRET!;
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': authHeader }
      });
      if (!rzpRes.ok) {
        throw new Error(`Failed to verify payment with Razorpay gateway (${rzpRes.status}).`);
      }
      const paymentData = (await rzpRes.json()) as any;
      if (paymentData.order_id !== orderId) {
        throw new Error('Payment verification mismatch: Order ID does not match payment record.');
      }
      if (paymentData.amount !== PLAN_CONFIG.amountPaise) {
        throw new Error(`Payment verification mismatch: Expected amount ${PLAN_CONFIG.amountPaise} paise, got ${paymentData.amount}.`);
      }
      if (paymentData.currency !== PLAN_CONFIG.currency) {
        throw new Error(`Payment verification mismatch: Expected currency ${PLAN_CONFIG.currency}, got ${paymentData.currency}.`);
      }
      if (paymentData.status !== 'captured' && paymentData.status !== 'authorized') {
        throw new Error(`Payment is not in captured or authorized status (status: ${paymentData.status}).`);
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Payment gateway credentials not configured on production server.');
    }

    const secret = this.getRazorpaySecret();
    if (!secret) {
      throw new Error('Payment gateway credentials not configured on server.');
    }

    // Verify HMAC SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = timingSafeEqualStrings(expectedSignature, signature);
    const now = new Date().toISOString();

    if (!isValid) {
      await dbRun(
        'UPDATE payment_transactions SET status = "failed", error_description = "Invalid HMAC signature", updated_at = ? WHERE id = ?;',
        [now, tx.id]
      );
      throw new Error('Payment verification failed: Invalid cryptographic payment signature.');
    }

    // Atomic update to mark transaction paid (prevents race conditions from concurrent duplicate requests)
    const updateResult = await dbRun(
      `UPDATE payment_transactions 
       SET status = 'paid', provider_payment_id = ?, provider_signature = ?, updated_at = ?
       WHERE id = ? AND status = 'created';`,
      [paymentId, signature, now, tx.id]
    );

    if (updateResult.changes === 0) {
      // Concurrent request or webhook already updated this transaction
      const sub = await this.getSubscription(userId);
      return {
        success: true,
        status: 'active',
        current_period_end: sub?.current_period_end || new Date().toISOString(),
        message: 'Payment was already processed successfully.'
      };
    }

    // Calculate period with renewal rollover:
    // If user currently has active time remaining, extend 30 days from existing period end!
    const existingSub = await this.getSubscription(userId);
    let currentPeriodStart = now;
    let currentPeriodEndMs = Date.now() + PLAN_CONFIG.paidDurationMs;

    if (existingSub && existingSub.current_period_end) {
      const existingEndMs = new Date(existingSub.current_period_end).getTime();
      if (existingEndMs > Date.now()) {
        currentPeriodStart = existingSub.current_period_start || now;
        currentPeriodEndMs = existingEndMs + PLAN_CONFIG.paidDurationMs;
      }
    }
    const currentPeriodEnd = new Date(currentPeriodEndMs).toISOString();

    if (existingSub) {
      await dbRun(
        `UPDATE subscriptions 
         SET status = 'active',
             current_period_start = ?,
             current_period_end = ?,
             cancel_at_period_end = 0,
             cancelled_at = NULL,
             provider_payment_id = ?,
             provider_order_id = ?,
             updated_at = ?
         WHERE id = ?;`,
        [currentPeriodStart, currentPeriodEnd, paymentId, orderId, now, existingSub.id]
      );
      await dbRun('UPDATE payment_transactions SET subscription_id = ? WHERE id = ?;', [existingSub.id, tx.id]);
    } else {
      const subId = `sub_${userId}`;
      await dbRun(
        `INSERT INTO subscriptions (id, user_id, plan_id, plan_name, amount_paise, currency, status, current_period_start, current_period_end, cancel_at_period_end, provider_payment_id, provider_order_id, created_at, updated_at)
         VALUES (?, ?, 'monthly_tier_8', 'Opportunity OS Pro', 800, 'INR', 'active', ?, ?, 0, ?, ?, ?, ?);`,
        [subId, userId, currentPeriodStart, currentPeriodEnd, paymentId, orderId, now, now]
      );
      await dbRun('UPDATE payment_transactions SET subscription_id = ? WHERE id = ?;', [subId, tx.id]);
    }

    return {
      success: true,
      status: 'active',
      current_period_end: currentPeriodEnd,
      message: 'Payment verified successfully. Opportunity OS Pro active for 30 days.'
    };
  }

  /**
   * Cancel subscription at end of billing period
   */
  async cancelSubscription(userId: string): Promise<{
    success: boolean;
    cancelAtPeriodEnd: boolean;
    accessUntil: string | null;
    message: string;
  }> {
    const sub = await this.getSubscription(userId);
    if (!sub) throw new Error('No subscription record found.');

    const now = new Date().toISOString();
    await dbRun(
      'UPDATE subscriptions SET cancel_at_period_end = 1, cancelled_at = ?, updated_at = ? WHERE id = ?;',
      [now, now, sub.id]
    );

    return {
      success: true,
      cancelAtPeriodEnd: true,
      accessUntil: sub.current_period_end || sub.trial_expires_at,
      message: 'Subscription will not renew. You retain access until the end of your current period.'
    };
  }

  /**
   * Idempotent Razorpay Webhook Event Processing
   */
  async processWebhook(rawBody: string, signature: string): Promise<{ handled: boolean; event: string; message: string }> {
    const webhookSecret = this.getWebhookSecret();
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured.');
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = timingSafeEqualStrings(expectedSignature, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature.');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid JSON payload in webhook.');
    }

    const event = payload.event;
    const now = new Date().toISOString();

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const idempotencyKey = `wh_${payload.id || paymentId}_${event}`;

      // Validate currency & amount
      if (paymentEntity.amount !== undefined && paymentEntity.amount !== PLAN_CONFIG.amountPaise) {
        throw new Error(`Webhook payment amount mismatch: expected ${PLAN_CONFIG.amountPaise} paise, got ${paymentEntity.amount}`);
      }
      if (paymentEntity.currency && paymentEntity.currency !== PLAN_CONFIG.currency) {
        throw new Error(`Webhook payment currency mismatch: expected ${PLAN_CONFIG.currency}, got ${paymentEntity.currency}`);
      }

      // Check if already processed
      const existingTx = await dbGet<PaymentTransactionRecord>(
        'SELECT * FROM payment_transactions WHERE idempotency_key = ? OR (provider_order_id = ? AND status = "paid") LIMIT 1;',
        [idempotencyKey, orderId]
      );

      if (existingTx && existingTx.status === 'paid') {
        return {
          handled: true,
          event,
          message: 'Event was already processed idempotently.'
        };
      }

      const userId = paymentEntity.notes?.userId || existingTx?.user_id;
      if (userId) {
        const sub = await this.getSubscription(userId);
        let currentPeriodStart = now;
        let currentPeriodEndMs = Date.now() + PLAN_CONFIG.paidDurationMs;

        if (sub && sub.current_period_end) {
          const existingEndMs = new Date(sub.current_period_end).getTime();
          if (existingEndMs > Date.now()) {
            currentPeriodStart = sub.current_period_start || now;
            currentPeriodEndMs = existingEndMs + PLAN_CONFIG.paidDurationMs;
          }
        }
        const currentPeriodEnd = new Date(currentPeriodEndMs).toISOString();

        if (sub) {
          await dbRun(
            `UPDATE subscriptions 
             SET status = 'active', current_period_start = ?, current_period_end = ?, cancel_at_period_end = 0, provider_payment_id = ?, provider_order_id = ?, updated_at = ?
             WHERE id = ?;`,
            [currentPeriodStart, currentPeriodEnd, paymentId, orderId, now, sub.id]
          );
        }

        if (existingTx) {
          await dbRun(
            `UPDATE payment_transactions
             SET status = 'paid', provider_payment_id = ?, idempotency_key = ?, updated_at = ?
             WHERE id = ? AND status = 'created';`,
            [paymentId, idempotencyKey, now, existingTx.id]
          );
        } else {
          // Record in payment_transactions with unique idempotency key
          const txId = `tx_wh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          await dbRun(
            `INSERT INTO payment_transactions (id, user_id, subscription_id, provider, provider_order_id, provider_payment_id, amount_paise, currency, status, idempotency_key, created_at, updated_at)
             VALUES (?, ?, ?, 'razorpay', ?, ?, ?, 'INR', 'paid', ?, ?, ?);`,
            [txId, userId, sub?.id || null, orderId, paymentId, PLAN_CONFIG.amountPaise, idempotencyKey, now, now]
          );
        }
      }

      return { handled: true, event, message: 'Payment captured and subscription extended.' };
    }

    if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const userId = paymentEntity.notes?.userId;

      if (userId && orderId) {
        const txId = `tx_fail_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await dbRun(
          `INSERT INTO payment_transactions (id, user_id, subscription_id, provider, provider_order_id, provider_payment_id, amount_paise, currency, status, error_description, created_at, updated_at)
           VALUES (?, ?, NULL, 'razorpay', ?, ?, ?, 'INR', 'failed', ?, ?, ?);`,
          [txId, userId, orderId, paymentId, PLAN_CONFIG.amountPaise, paymentEntity.error_description || 'Payment failed', now, now]
        );
      }
      return { handled: true, event, message: 'Payment failure recorded.' };
    }

    return { handled: true, event, message: `Ignored unhandled event: ${event}` };
  }

  /**
   * List payment transactions for authenticated user
   */
  async listTransactions(userId: string): Promise<PaymentTransactionRecord[]> {
    return dbAll<PaymentTransactionRecord>(
      'SELECT * FROM payment_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20;',
      [userId]
    );
  }
}

export const subscriptionService = new SubscriptionService();
