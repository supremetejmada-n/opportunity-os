import React from 'react';
import { Sparkles, ArrowRight, Zap, Wrench, Target, ShieldCheck } from 'lucide-react';
import { MagneticButton } from '../ui/MagneticButton.js';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';

interface HomeHeroProps {
  userName: string;
  profile: UserProfile | null;
  skills: UserSkill[];
  tools: UserTool[];
  goals: UserGoal[];
  onExploreClick: () => void;
  onScanClick: () => void;
  isScanning: boolean;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  userName,
  profile,
  skills,
  tools,
  goals,
  onExploreClick,
  onScanClick,
  isScanning,
}) => {
  const freeToolsCount = tools.filter(t => 
    t.access_type.toLowerCase().includes('free') || t.access_type.toLowerCase().includes('open')
  ).length;

  return (
    <section className="relative w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 pb-12 sm:pb-16 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline & Plain English Narrative */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5 text-peach-400 animate-pulse" />
            <span>Personal AI Opportunity Engine</span>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] bg-gradient-to-r from-slate-100 via-slate-200 to-peach-400 bg-clip-text text-transparent">
              Find something worth building.
            </h1>
            <p className="font-sans text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
              Opportunity OS looks at what’s new in AI, what people need, and what you already have — then helps you find something you can actually build and turn into income.
            </p>
          </div>

          {/* ONE Primary CTA */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <MagneticButton
              onClick={onExploreClick}
              variant="primary"
              className="text-sm py-3.5 px-8 font-bold shadow-xl shadow-peach-500/25 border border-white/40 flex items-center gap-3"
            >
              <span>Explore Opportunity OS</span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>

            <button
              onClick={onScanClick}
              disabled={isScanning}
              className="px-5 py-3.5 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all flex items-center gap-2 border border-white/10"
            >
              <Zap className={`h-3.5 w-3.5 text-peach-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Run Quick Scan'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Clean Vector Summary Surface */}
        <div className="lg:col-span-5 bg-navy-950/80 p-6 sm:p-7 rounded-3xl border border-white/15 backdrop-blur-2xl space-y-5 shadow-2xl shadow-black/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/40 to-transparent" />
          
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Your Builder Vector</h3>
              <p className="text-[11px] text-slate-400 font-sans">Active Profile Context</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
              Active • {userName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/5 space-y-1 text-left">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Zap className="h-3 w-3 text-peach-400" /> Active Skills
              </span>
              <p className="text-lg font-bold text-slate-100 font-mono">{skills.length}</p>
            </div>

            <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/5 space-y-1 text-left">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Wrench className="h-3 w-3 text-emerald-400" /> Free Tools
              </span>
              <p className="text-lg font-bold text-slate-100 font-mono">{tools.length} <span className="text-[10px] text-emerald-400 font-sans">({freeToolsCount} free)</span></p>
            </div>

            <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/5 space-y-1 text-left">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Target className="h-3 w-3 text-amber-400" /> User Goals
              </span>
              <p className="text-lg font-bold text-slate-100 font-mono">{goals.length}</p>
            </div>

            <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/5 space-y-1 text-left">
              <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Budget Limit
              </span>
              <p className="text-lg font-bold text-emerald-400 font-mono">₹{profile?.preferred_budget ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
