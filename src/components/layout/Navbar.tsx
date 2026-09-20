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
  X
} from 'lucide-react';
import { UserProfile } from '../../types/index.js';

export type NavTab = 'home' | 'discover' | 'opportunities' | 'combine' | 'progress' | 'profile';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pillar 9: Global Keyboard Shortcut Listener (⌘K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onScanClick();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onScanClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanClick]);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: "What's New", icon: Compass },
    { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
    { id: 'combine', label: 'Combine Tools', icon: Layers },
    { id: 'progress', label: 'Your Plan', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const displayName = profile?.name ? profile.name.split(' ')[0] : 'Advisor';

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 pt-3 pb-2 transition-all duration-300">
      {/* Pillar 8: Floating Detached Navigation Dock */}
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 rounded-full border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-2xl relative overflow-hidden [box-shadow:0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.14)]">
        {/* Specular inset top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        
        {/* Brand Title + Living System Beacon */}
        <button 
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
            <span className="relative flex h-2 w-2" title="System Engine Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </button>

        {/* Desktop Navigation Translucent Glass Dock with Shared Layout Glider */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.08] backdrop-blur-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans transition-colors z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute inset-0 rounded-full bg-white/15 border border-white/20 backdrop-blur-md shadow-lg shadow-white/5"
                  />
                )}
                <Icon className={`h-3.5 w-3.5 z-10 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`z-10 ${isActive ? 'text-white font-semibold' : 'text-slate-300 font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions & Keyboard Shortcuts */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onScanClick}
            disabled={isScanning}
            className="btn-primary text-xs py-1.5 px-3.5 h-8 font-semibold flex items-center gap-2 shadow-lg"
            title="Trigger discovery and evaluation scan (Shortcut: ⌘K or /)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Now'}</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-navy-950/40 rounded border border-white/20 text-slate-800 font-bold">⌘K</kbd>
          </button>

          {/* Executive Builder Identity Nav Token */}
          <button
            onClick={() => handleNavClick('profile')}
            className={`relative flex items-center gap-2 rounded-full p-1 pl-3 pr-1 border transition-all duration-300 ease-out active:scale-95 group cursor-pointer ${
              activeTab === 'profile'
                ? 'border-peach-500/60 bg-peach-500/15 text-white shadow-[0_0_20px_rgba(255,165,134,0.35)] scale-[1.03]'
                : 'border-white/20 bg-white/[0.05] hover:border-peach-500/40 hover:bg-white/10 hover:shadow-[0_0_18px_rgba(255,165,134,0.25)] hover:scale-[1.03]'
            }`}
            title="Open Builder Identity Dossier"
          >
            {/* Live Pulsing Radar Dot */}
            <span className="relative flex h-2 w-2" title="Identity Vector Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>

            <span className="text-xs font-semibold tracking-wide text-slate-200 group-hover:text-white hidden sm:inline">
              {displayName}
            </span>

            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-peach-500/30 via-indigo-600/30 to-emerald-500/30 text-white text-[10px] font-bold border border-white/25 group-hover:border-peach-500/60 transition-all duration-300 shadow-sm">
              <User className="h-3 w-3 text-peach-300" />
            </div>
          </button>

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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold border border-white/20'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
