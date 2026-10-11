import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
  CreditCard,
  Loader2,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext.js';
import { useAuth } from '../../context/AuthContext.js';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export const SubscriptionModal: React.FC = () => {
  const { user } = useAuth();
  const {
    subscription,
    isSubscriptionModalOpen,
    closeSubscriptionModal,
    createOrder,
    verifyPayment,
    cancelSubscription
  } = useSubscription();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isSubscriptionModalOpen) return null;

  const status = subscription?.status || 'trialing';
  const trial = subscription?.trial;
  const plan = subscription?.plan;
  const isExpired = subscription?.trial.isExpired || status === 'expired';
  const isActive = status === 'active';
  const isCancelled = status === 'cancelled';

  // Load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const order = await createOrder();

      if (!order.isLive || !order.keyId) {
        // Razorpay keys not yet configured in production environment
        setError(
          'Payment gateway credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured on the backend. Please configure credentials in your backend environment to process live payments.'
        );
        setLoading(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'Opportunity OS',
        description: order.description,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            setLoading(true);
            await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            setSuccessMessage('Payment verified successfully! Welcome to Opportunity OS Pro.');
            setTimeout(() => {
              setSuccessMessage(null);
              closeSubscriptionModal();
            }, 2500);
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#f97316'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment was unsuccessful or cancelled.');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment.');
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your renewal? You will retain access until the end of your billing cycle.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await cancelSubscription();
      setSuccessMessage('Your subscription has been cancelled and will not renew.');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSubscriptionModal}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-peach-500 via-emerald-400 to-indigo-500" />

          {/* Close button */}
          <button
            onClick={closeSubscriptionModal}
            className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/15 text-peach-400 mb-3 shadow-inner">
              {isActive ? (
                <Shield className="h-6 w-6 text-emerald-400" />
              ) : isExpired ? (
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              ) : (
                <Zap className="h-6 w-6 text-peach-300" />
              )}
            </div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight">
              {isActive && 'Opportunity OS Pro Member'}
              {isExpired && '3-Day Free Trial Expired'}
              {status === 'trialing' && '3-Day Full-Access Free Trial'}
              {isCancelled && 'Pro Membership (Cancelling)'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isActive
                ? 'Your subscription is active. You have unrestricted access to all features.'
                : isExpired
                ? 'Subscribe to Opportunity OS Pro to continue exploring live opportunities and workflows.'
                : 'Enjoy full access to all features for 3 days. No card required to start.'}
            </p>
          </div>

          {/* Trial Remaining Countdown (if trialing) */}
          {status === 'trialing' && trial && (
            <div className="mb-6 rounded-2xl border border-peach-500/30 bg-peach-500/10 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-peach-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Trial Remaining
                </span>
                <span className="font-mono text-white font-bold">{trial.remainingFormatted}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-peach-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, (trial.remainingSeconds / (3 * 24 * 3600)) * 100))}%`
                  }}
                />
              </div>
              {trial.isEndingSoon && (
                <p className="mt-2 text-[11px] text-peach-300/90 font-medium">
                  ⚠️ Your trial ends in less than 24 hours. Subscribe now to maintain continuous access.
                </p>
              )}
            </div>
          )}

          {/* Active Subscription Details */}
          {isActive && subscription?.currentPeriod?.end && (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Current Billing Cycle
                </span>
                <span className="text-white font-mono text-[11px]">
                  Active until {new Date(subscription.currentPeriod.end).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Transparent Plan Card */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Opportunity OS Pro</h3>
                <p className="text-[11px] text-slate-400">Complete AI Opportunity Engine</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-white">₹8</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
            </div>

            {/* Included features */}
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>8-Factor Real Opportunity Scoring (Demand, Tools, Skills)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Synergistic Multi-Tool Workflow Combinations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>6-Phase Practical Execution Action Plans & Step Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Live Opportunity Radar Scans across GitHub, HuggingFace & PH</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Adaptive Personal Preference & Learning Signal Engine</span>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="h-3 w-3 text-slate-400" />
              <span>No surprise charges. Cancel anytime from your account.</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isActive && (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-peach-500 to-emerald-400 py-3 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Subscribe for ₹8 / Month</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}

            {isActive && !isCancelled && (
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={loading}
                className="w-full py-2.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
              >
                Cancel Subscription Renewal
              </button>
            )}

            {status === 'trialing' && (
              <button
                type="button"
                onClick={closeSubscriptionModal}
                className="w-full text-center py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Continue Free Trial
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
