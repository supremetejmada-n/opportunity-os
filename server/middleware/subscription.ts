import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscriptionService.js';

/**
 * Express middleware that enforces active subscription entitlement.
 * Entitlement is verified server-side via trusted database records (active subscription or unexpired 3-day trial).
 * NEVER trusts client-supplied flags like isSubscribed.
 */
export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.userId || req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const entitlement = await subscriptionService.getEntitlement(userId);
    if (entitlement.isEntitled) {
      return next();
    }

    res.status(403).json({
      error: 'Active subscription or free trial required to access this feature.',
      code: 'SUBSCRIPTION_EXPIRED',
      status: entitlement.status,
      trialExpired: entitlement.trial.isExpired,
      plan: entitlement.plan,
      message: 'Your 3-day free trial has expired. Subscribe to Opportunity OS Pro for ₹8/month to continue using this feature.'
    });
  } catch (err: any) {
    console.error('[Subscription Middleware] Error checking entitlement:', err.message);
    res.status(500).json({ error: 'Failed to verify subscription status.' });
  }
}
