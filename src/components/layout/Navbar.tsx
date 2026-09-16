import React, { useState } from 'react';
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
    <header className="sticky top-0 z-40 w-full px-4 pt-3 pb-1 bg-gradient-to-b from-navy-950 via-navy-950/80 to-transparent">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 rounded-2xl border border-white/10 bg-navy-950/80 backdrop-blur-xl shadow-2xl shadow-black/80 relative overflow-hidden">
        {/* Specular glass reflection line top in warm peach */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/40 to-transparent pointer-events-none" />
        
        {/* Brand Title */}
        <button 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-peach-500 text-navy-950 font-bold shadow-md shadow-peach-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-sm font-bold text-slate-100 tracking-wider uppercase">
                Opportunity OS
              </h1>
              <span className="h-1.5 w-1.5 rounded-full bg-peach-500 animate-pulse" title="Engine Active" />
            </div>
            <p className="text-[10px] font-sans text-slate-400 font-medium">
              Personal Advisor
            </p>
          </div>
        </button>

        {/* Desktop Navigation Pill Strip */}
        <nav className="hidden md:flex items-center gap-1 bg-navy-900/90 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all active:scale-[0.97] ${
                  isActive
                    ? 'bg-peach-500 text-navy-950 font-bold shadow-md shadow-peach-500/30 border border-white/30'
                    : 'text-slate-400 font-semibold hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-navy-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Trigger Scan Button */}
          <button
            onClick={onScanClick}
            disabled={isScanning}
            className="btn-secondary text-xs py-1 px-3 h-8"
            title="Trigger discovery and evaluation scan"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-peach-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-medium">{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>

          {/* Profile Quick Pill */}
          <button
            onClick={() => handleNavClick('profile')}
            className={`flex items-center gap-2 rounded-full p-1 pl-2.5 pr-1 border transition-all active:scale-[0.97] ${
              activeTab === 'profile'
                ? 'border-peach-500/50 bg-peach-500/10'
                : 'border-slate-800 bg-navy-900/80 hover:border-slate-700'
            }`}
          >
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {displayName}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-burgundy-900 text-peach-500 text-[10px] font-bold border border-crimson-500/40">
              <User className="h-3 w-3" />
            </div>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 btn-ghost"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden mt-2 mx-auto max-w-6xl border border-slate-800/80 bg-slate-950/95 backdrop-blur-md rounded-xl p-2 space-y-1 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-900'
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
