import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Compass, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  User, 
  RefreshCw,
  Menu,
  X,
  LogIn,
  LogOut,
  Clock,
  AlertCircle
} from 'lucide-react';
import { MetalBadge } from 'metal-fx';
import { UserProfile } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSubscription } from '../../context/SubscriptionContext.js';

export type NavTab = 'home' | 'discover' | 'opportunities' | 'combine' | 'profile' | 'progress';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  profile: UserProfile | null;
  onScanClick: () => void;
  isScanning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onScanClick,
  isScanning,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { subscription, openSubscriptionModal } = useSubscription();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pillar 9: Global Keyboard Shortcut Listener (⌘K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onScanClick();
        setActiveTab('discover');
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onScanClick();
        setActiveTab('discover');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanClick, setActiveTab]);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'New AI Tools', icon: Compass },
    { id: 'opportunities', label: 'Ways to Earn', icon: Sparkles },
    { id: 'combine', label: 'Combine Tools', icon: Layers },
  ];

  const mobileNavItems = [
    ...navItems,
    { id: 'profile' as NavTab, label: 'Supreme', icon: User },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const displayName = profile?.name ? profile.name.split(' ')[0] : 'Advisor';

  return (
    <header className="sticky top-4 z-50 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-1 pb-2 transition-all duration-300 transform-gpu [transform:translateZ(0)]">
      {/* Pillar 8: Floating Detached Navigation Dock */}
      <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6 rounded-full border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl relative overflow-hidden [box-shadow:0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.14)]">
        {/* Specular inset top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        
        {/* Brand Title + Living System Beacon */}
        <button 
          type="button"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-peach-400 font-bold border border-white/15 group-hover:scale-105 transition-transform">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
              Opportunity OS
            </h1>
            {/* Living System Beacon Status Dot */}
            <MetalBadge scale={0.65} children="Active" />
          </div>
        </button>

        {/* Desktop Navigation Translucent Glass Dock with Shared Layout Glider */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.08] backdrop-blur-md relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-sans font-medium transition-colors cursor-pointer select-none z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 35,
                      mass: 0.6,
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-white/10 to-white/5 border border-white/30 pointer-events-none transform-gpu will-change-transform shadow-[0_4px_16px_rgba(255,255,255,0.15)]"
                    style={{ zIndex: 0 }}
                  >
                    <div className="absolute top-0 left-2 right-2 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  </motion.div>
                )}
                <Icon className={`h-3.5 w-3.5 relative z-10 transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`relative z-10 font-medium transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-300'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions & Keyboard Shortcuts */}
        <div className="flex items-center gap-2.5">
          {/* Subscription Status Pill */}
          {isAuthenticated && subscription && (
            <button
              type="button"
              onClick={openSubscriptionModal}
              data-testid="navbar-subscription-btn"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                subscription.status === 'active'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : subscription.status === 'trialing'
                  ? subscription.trial.isEndingSoon
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
                    : 'border-peach-500/40 bg-peach-500/10 text-peach-300 hover:bg-peach-500/20'
                  : 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              }`}
              title={
                subscription.status === 'active'
                  ? 'Pro Active (₹8/mo) - Manage Subscription'
                  : subscription.status === 'trialing'
                  ? `Free Trial: ${subscription.trial.remainingFormatted} remaining - Upgrade to Pro`
                  : 'Subscription Expired - Unlock Pro for ₹8/mo'
              }
            >
              {subscription.status === 'active' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="hidden sm:inline">Pro Member</span>
                  <span className="sm:hidden">Pro</span>
                </>
              ) : subscription.status === 'trialing' ? (
                <>
                  <Clock className="h-3 w-3 text-peach-400" />
                  <span className="hidden sm:inline">Trial: {subscription.trial.remainingFormatted}</span>
                  <span className="sm:hidden">Trial</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-rose-400" />
                  <span>Subscribe ₹8</span>
                </>
              )}
            </button>
          )}

          {/* Executive Builder Identity Nav Token / Auth Actions */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNavClick('profile')}
                className={`relative flex items-center gap-2 rounded-full p-1 pl-3 pr-1 border transition-all duration-300 ease-out active:scale-95 group cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-peach-500/60 bg-peach-500/15 text-white shadow-[0_0_20px_rgba(255,165,134,0.35)] scale-[1.03]'
                    : 'border-white/20 bg-white/[0.05] hover:border-peach-500/40 hover:bg-white/10 hover:shadow-[0_0_18px_rgba(255,165,134,0.25)] hover:scale-[1.03]'
                }`}
                title={`Logged in as ${user?.email}. Open Builder Dossier.`}
              >
                <span className="text-xs font-semibold tracking-wide text-slate-200 group-hover:text-white hidden sm:inline">
                  {displayName}
                </span>

                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-peach-500/30 via-indigo-600/30 to-emerald-500/30 text-white text-[10px] font-bold border border-white/25 group-hover:border-peach-500/60 transition-all duration-300 shadow-sm">
                  <User className="h-3 w-3 text-peach-300" />
                </div>
              </button>

              <button
                onClick={() => logout()}
                className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 rounded-full border border-peach-500/40 bg-peach-500/15 px-3 py-1 text-xs font-semibold text-peach-300 hover:bg-peach-500/25 hover:border-peach-500/60 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 btn-ghost"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden mt-2 mx-auto w-full max-w-6xl border border-white/10 bg-slate-950/95 backdrop-blur-xl rounded-2xl p-2 space-y-1 shadow-2xl">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-white/15 text-white font-medium border border-white/20'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-white/10 px-2 space-y-1">
            {isAuthenticated && subscription && (
              <button
                type="button"
                onClick={() => { openSubscriptionModal(); setMobileMenuOpen(false); }}
                data-testid="mobile-subscription-btn"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {subscription.status === 'active' ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  ) : subscription.status === 'trialing' ? (
                    <Clock className="h-4 w-4 text-peach-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span>
                    {subscription.status === 'active'
                      ? 'Pro Plan (₹8/mo)'
                      : subscription.status === 'trialing'
                      ? `Trial: ${subscription.trial.remainingFormatted}`
                      : 'Subscription Expired'}
                  </span>
                </div>
                <span className="text-[11px] text-peach-400 font-semibold">
                  {subscription.status === 'active' ? 'Manage' : 'Upgrade'}
                </span>
              </button>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out ({user?.email})</span>
              </button>
            ) : (
              <button
                onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-peach-300 hover:bg-peach-500/10 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
