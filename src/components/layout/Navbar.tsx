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
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
    { id: 'combine', label: 'Combine', icon: Layers },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const displayName = profile?.name ? profile.name : 'Profile';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">
              Opportunity Engine
            </h1>
            <p className="text-[10px] font-medium text-slate-400">
              Personal Intelligence System
            </p>
          </div>
        </div>

        {/* Desktop Single Nav Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Secondary CTA for Navbar Scan Button */}
          <button
            onClick={onScanClick}
            disabled={isScanning}
            className="btn-secondary text-xs py-1.5 px-3"
            title="Trigger discovery and evaluation scan"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>

          {/* Profile Quick Pill */}
          <button
            onClick={() => handleNavClick('profile')}
            className={`flex items-center gap-2 rounded-full p-1 pl-2.5 pr-1 border transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-500/50 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
          >
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {displayName}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 border border-slate-700">
              <User className="h-3 w-3" />
            </div>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
