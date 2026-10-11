import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, ShieldCheck, Sparkles, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, signup, error: authError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode when modal opens or URL has token
  useEffect(() => {
    setMode(authModalMode);
    setLocalError(null);
    setSuccessMessage(null);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token') || params.get('token');
      if (token) {
        setResetToken(token);
        setMode('reset');
      }
    }
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (mode === 'forgot') {
      if (!email) {
        setLocalError('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.auth.forgotPassword(email);
        setSuccessMessage(res.message || 'If an account exists with that email, instructions have been sent.');
      } catch (err: any) {
        setLocalError(err.message || 'Failed to request password reset.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (!resetToken) {
        setLocalError('Reset token is missing or invalid.');
        return;
      }
      if (!password || password.length < 8) {
        setLocalError('New password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await api.auth.resetPassword({ token: resetToken, newPassword: password });
        setSuccessMessage(res.message || 'Password has been updated successfully.');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccessMessage('Password updated! You can now sign in.');
        }, 2000);
      } catch (err: any) {
        setLocalError(err.message || 'Failed to reset password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login or Signup
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, name || undefined);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    if (import.meta.env.DEV) {
      const devEmail = import.meta.env.VITE_DEV_LEGACY_EMAIL || 'owner@opportunityos.local';
      const devPass = import.meta.env.VITE_DEV_LEGACY_PASSWORD || '';
      setEmail(devEmail);
      if (devPass) setPassword(devPass);
      setMode('login');
    }
  };

  const displayError = localError || authError;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Header Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-peach-500 via-emerald-400 to-indigo-500" />

          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/15 text-peach-400 mb-3 shadow-inner">
              <ShieldCheck className="h-6 w-6 text-peach-300" />
            </div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight">
              {mode === 'login' && 'Sign In to Opportunity OS'}
              {mode === 'signup' && 'Create Builder Account'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'reset' && 'Set New Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login' && 'Access your private opportunities, action plans, and progress dossier.'}
              {mode === 'signup' && 'Get personalized AI tool recommendations and private execution tracking.'}
              {mode === 'forgot' && 'Enter your email to receive secure password reset instructions.'}
              {mode === 'reset' && 'Enter and confirm your new secure password.'}
            </p>
          </div>

          {/* Tab switcher (only for login & signup) */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10 mb-5">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-peach-500/20 text-white border border-peach-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setLocalError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-peach-500/20 text-white border border-peach-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Back button for forgot/reset modes */}
          {(mode === 'forgot' || mode === 'reset') && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); setSuccessMessage(null); }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{displayError}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Supreme Tej"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-peach-500/60 focus:bg-white/[0.08] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-peach-500/60 focus:bg-white/[0.08] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300">
                    Password <span className="text-slate-500">(min 8 chars)</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setLocalError(null); setSuccessMessage(null); }}
                      className="text-[10px] text-peach-400 hover:text-peach-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-peach-500/60 focus:bg-white/[0.08] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    New Password <span className="text-slate-500">(min 8 chars)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-peach-500/60 focus:bg-white/[0.08] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-peach-500/60 focus:bg-white/[0.08] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-peach-500 to-emerald-400 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-[0.99] transition-all shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {mode === 'login' && 'Authenticating...'}
                    {mode === 'signup' && 'Creating Account...'}
                    {mode === 'forgot' && 'Sending Instructions...'}
                    {mode === 'reset' && 'Updating Password...'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Link'}
                    {mode === 'reset' && 'Update Password'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Account Selector (Dev only) */}
          {import.meta.env.DEV && (
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] text-peach-400 hover:text-peach-300 flex items-center justify-center gap-1.5 mx-auto font-medium transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>[Local Dev] Fill Legacy Owner Account</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
