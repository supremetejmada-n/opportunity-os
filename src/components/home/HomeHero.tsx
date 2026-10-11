import React from 'react';
import { Sparkles, ArrowRight, Zap, Wrench, Target, ShieldCheck } from 'lucide-react';
import { MagneticButton } from '../ui/MagneticButton.js';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';
import { CardShimmerWrapper } from '../ui/card-shimmer-wrapper.js';
import { AnimatedMetric } from '../widgets/animated-metric.js';
import { AnimatedBadge } from '../widgets/animated-badge.js';

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
    <ScrollReveal className="relative w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 min-h-[calc(100vh-6.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-10 text-left">
      <ScrollRevealStagger className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full my-auto">
        {/* Left Column: Headline & Plain English Narrative */}
        <ScrollRevealItem className="lg:col-span-7 space-y-6">
          <AnimatedBadge glow className="bg-white/10 border-white/15 text-peach-400 font-mono text-xs">
            <Sparkles className="h-3.5 w-3.5 text-peach-400 animate-pulse" />
            <span>Personal AI Opportunity Engine</span>
          </AnimatedBadge>

          <div className="space-y-4">
            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-[1.06] bg-gradient-to-r from-slate-100 via-slate-200 to-peach-400 bg-clip-text text-transparent">
              Turn simple AI tools into real monthly income.
            </h1>
            <p className="font-sans text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
              Opportunity OS matches you with ready-to-sell service ideas, combines free tools like ChatGPT, Canva, and WhatsApp, and gives you step-by-step plans to earn from real clients.
            </p>
          </div>

          {/* ONE Primary CTA */}
          <div className="pt-2 flex items-center">
            <MagneticButton
              onClick={onExploreClick}
              variant="primary"
              aria-label="Enter Opportunity OS →"
              className="text-sm py-3.5 px-8 font-bold shadow-xl shadow-peach-500/25 border border-white/40 flex items-center gap-3"
            >
              <span>Enter Opportunity OS</span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </ScrollRevealItem>

        {/* Right Column: Clean Vector Summary Surface */}
        <ScrollRevealItem className="lg:col-span-5">
          <CardShimmerWrapper className="p-6 sm:p-7 metal-panel-primary border-white/20 backdrop-blur-2xl space-y-5 shadow-2xl shadow-black/70 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/50 to-transparent" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Your Builder Vector</h3>
                <p className="text-[11px] text-slate-400 font-sans">Active Profile Context</p>
              </div>
              <AnimatedBadge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Active • {userName}
              </AnimatedBadge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/8 space-y-1 text-left">
                <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                  <Zap className="h-3 w-3 text-peach-400" /> Active Skills
                </span>
                <p className="text-lg font-bold text-slate-100 font-mono">
                  <AnimatedMetric value={skills.length} />
                </p>
              </div>

              <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/8 space-y-1 text-left">
                <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                  <Wrench className="h-3 w-3 text-emerald-400" /> Free Tools
                </span>
                <p className="text-lg font-bold text-slate-100 font-mono">
                  <AnimatedMetric value={tools.length} /> <span className="text-[10px] text-emerald-400 font-sans">({freeToolsCount} free)</span>
                </p>
              </div>

              <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/8 space-y-1 text-left">
                <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                  <Target className="h-3 w-3 text-amber-400" /> User Goals
                </span>
                <p className="text-lg font-bold text-slate-100 font-mono">
                  <AnimatedMetric value={goals.length} />
                </p>
              </div>

              <div className="bg-navy-900/70 p-3.5 rounded-xl border border-white/8 space-y-1 text-left">
                <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" /> Budget Limit
                </span>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {profile?.preferred_budget !== undefined && profile?.preferred_budget !== null && !isNaN(Number(profile.preferred_budget))
                    ? Number(profile.preferred_budget) === 0
                      ? "₹0 (Free Only)"
                      : `₹${profile.preferred_budget}`
                    : "₹0 (Free Only)"}
                </p>
              </div>
            </div>
          </CardShimmerWrapper>
        </ScrollRevealItem>
      </ScrollRevealStagger>
    </ScrollReveal>
  );
};

