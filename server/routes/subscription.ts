import { Router, Request, Response } from 'express';
import { subscriptionService } from '../services/subscriptionService.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

export const subscriptionRouter = Router();

const orderRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many order creation requests. Please try again later.',
  skipInTesting: true
});

const verifyRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment verification attempts. Please try again later.',
  skipInTesting: true
});

const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many webhook requests.',
  skipInTesting: true
});

// GET /api/subscription/status — Check current entitlement & trial status
subscriptionRouter.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const entitlement = await subscriptionService.getEntitlement(userId);
    res.json(entitlement);
  } catch (error: any) {
    console.error('[Subscription Router] Error getting status:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription status.' });
  }
});

// POST /api/subscription/create-order — Initiate ₹8 payment order
subscriptionRouter.post('/create-order', requireAuth, orderRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const order = await subscriptionService.createPaymentOrder(userId);
    res.json(order);
  } catch (error: any) {
    console.error('[Subscription Router] Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order.' });
  }
});

// POST /api/subscription/verify-payment — Verify Razorpay HMAC signature and activate subscription
subscriptionRouter.post('/verify-payment', requireAuth, verifyRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { orderId, paymentId, signature } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'Missing required parameters: orderId, paymentId, and signature are required.'
      });
    }

    const result = await subscriptionService.verifyPayment(userId, {
      orderId,
      paymentId,
      signature
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Subscription Router] Error verifying payment:', error);
    res.status(400).json({ error: error.message || 'Payment verification failed.' });
  }
});

// POST /api/subscription/cancel — Cancel subscription at period end
subscriptionRouter.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await subscriptionService.cancelSubscription(userId);
    res.json(result);
  } catch (error: any) {
    console.error('[Subscription Router] Error cancelling subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription.' });
  }
});

// GET /api/subscription/transactions — Payment history
subscriptionRouter.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactions = await subscriptionService.listTransactions(userId);
    res.json({ transactions });
  } catch (error: any) {
    console.error('[Subscription Router] Error listing transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to list transactions.' });
  }
});

// POST /api/subscription/webhook — Razorpay Webhook receiver
subscriptionRouter.post('/webhook', webhookRateLimiter, async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    if (!signature) {
      return res.status(400).json({ error: 'Missing x-razorpay-signature header.' });
    }

    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const result = await subscriptionService.processWebhook(rawBody, signature);
    res.json(result);
  } catch (error: any) {
    console.error('[Subscription Router] Webhook error:', error);
    res.status(400).json({ error: error.message || 'Webhook processing failed.' });
  }
});
