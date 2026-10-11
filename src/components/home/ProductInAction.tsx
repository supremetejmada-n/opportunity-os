import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { Compass, Sparkles, Layers, TrendingUp, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';
import { CardShimmerWrapper } from '../ui/card-shimmer-wrapper.js';
import { AnimatedMetric } from '../widgets/animated-metric.js';
import { AnimatedBarChart } from '../widgets/animated-bar-chart.js';
import { AnimatedSparkline } from '../widgets/animated-sparkline.js';
import { AnimatedBadge } from '../widgets/animated-badge.js';
import { UserProfile, UserSkill, UserTool, UserGoal } from '../../types/index.js';

interface ProductInActionProps {
  onNavigateTab?: (tab: any) => void;
  profile?: UserProfile | null;
  skills?: UserSkill[];
  tools?: UserTool[];
  goals?: UserGoal[];
  bestOpp?: any;
  hasCompletedScan?: boolean;
}

export const ProductInAction: React.FC<ProductInActionProps> = ({ 
  onNavigateTab,
  profile,
  skills = [],
  tools = [],
  goals = [],
  bestOpp,
  hasCompletedScan = false
}) => {
  const [activePreview, setActivePreview] = useState<'discover' | 'opportunities' | 'combine' | 'progress'>('discover');

  const hasProfileInputs = (tools && tools.length > 0) || (skills && skills.length > 0);
  const toolCount = tools.length;
  const skillCount = skills.length;
  const toolNamesStr = tools.slice(0, 4).map(t => t.name).join(' + ');

  const previews = [
    {
      id: 'discover' as const,
      label: 'New AI Tools',
      icon: Compass,
      headline: hasProfileInputs ? 'Live Public Signals' : 'Public Signal Scanner',
      sub: hasProfileInputs 
        ? `Real-time vector scan filtered against your ${toolCount} accessible profile tools.`
        : 'Real-time vector scan across developer platforms, public APIs, and emerging market demands.',
      badge: !hasProfileInputs ? 'Scanner Ready' : hasCompletedScan ? 'Scan Completed' : 'Scanner Ready',
      previewCard: {
        title: !hasProfileInputs 
          ? 'Public Market Signals' 
          : bestOpp?.title 
            ? `Signal Match: ${bestOpp.title}` 
            : 'Live API & Demand Webhooks',
        meta: !hasProfileInputs 
          ? '0 Tools Configured • Setup Required' 
          : `${bestOpp?.matchScore || 92}% Vector Fit • ${toolCount} Profile Tools`,
        bullet1: !hasProfileInputs 
          ? 'Scans open-source AI models & webhooks' 
          : `Matched with active tools (${tools.slice(0, 2).map(t => t.name).join(', ') || 'Profile Tools'})`,
        bullet2: !hasProfileInputs 
          ? 'Add tools in Supreme profile to filter signals' 
          : 'Zero-cost dev setup verified',
      },
    },
    {
      id: 'opportunities' as const,
      label: 'Ways to Earn',
      icon: Sparkles,
      headline: 'Ranked Fit Engine',
      sub: hasProfileInputs 
        ? `Evaluated against your ${toolCount} tools, ${skillCount} skills, and zero-cost constraints.`
        : 'Evaluates opportunities against your profile tools, skills, and zero-cost constraints.',
      badge: !hasProfileInputs ? 'Profile Unconfigured' : bestOpp ? '#1 Ranked Match' : 'Matches Ready',
      previewCard: {
        title: !hasProfileInputs 
          ? 'Add Profile Inputs to Unlock Matches' 
          : (bestOpp?.title || 'Personalized AI Opportunity Match'),
        meta: !hasProfileInputs 
          ? '0 Tools Connected • 0 Matches' 
          : `${bestOpp?.matchScore || 95}% Fit Score • ${bestOpp?.estimatedRevenue || '₹5,000–₹25,000/mo'}`,
        bullet1: !hasProfileInputs 
          ? 'Requires at least 1 tool or skill in Supreme profile' 
          : `Combines ${tools.slice(0, 3).map(t => t.name).join(', ') || 'your profile tools'}`,
        bullet2: !hasProfileInputs 
          ? 'Strict zero-cost execution bounds enforced' 
          : 'Working demo build time: ~1–2 days',
      },
    },
    {
      id: 'combine' as const,
      label: 'Combine Tools',
      icon: Layers,
      headline: 'Tool Combiner Synergy',
      sub: hasProfileInputs 
        ? `Links your ${toolCount} accessible tools into zero-cost service workflows.`
        : 'Links 2–4 tools you access for free into zero-cost workflow micro-services.',
      badge: !hasProfileInputs ? '0 Synergies' : `${toolCount} Tools Active`,
      previewCard: {
        title: !hasProfileInputs 
          ? '0 Profile Tools Connected' 
          : (toolNamesStr || 'Multi-Tool Synergy'),
        meta: !hasProfileInputs 
          ? '0 Tools Connected • ₹0 Upfront' 
          : `${toolCount} Tools Connected • ₹0 Upfront Cost`,
        bullet1: !hasProfileInputs 
          ? 'Combine tools like ChatGPT, Canva & Python' 
          : `Automates workflow between ${tools.slice(0, 3).map(t => t.name).join(' & ') || 'your tools'}`,
        bullet2: !hasProfileInputs 
          ? 'Add 2+ tools to unlock zero-cost synergies' 
          : 'Full source template & guide included',
      },
    },
    {
      id: 'progress' as const,
      label: 'Step-by-Step Guide',
      icon: TrendingUp,
      headline: 'Execution Roadmap',
      sub: 'Actionable steps to build a demo, reach target buyers, and log your progress.',
      badge: !hasProfileInputs ? 'No Active Plan' : bestOpp ? 'Plan Ready' : 'Execution Roadmap',
      previewCard: {
        title: !hasProfileInputs 
          ? 'No Active Plan Selected' 
          : bestOpp ? `Phase 1: Learn Demand → ${bestOpp.title}` : 'Phase 1: Learn Demand → Phase 2: Build Demo',
        meta: !hasProfileInputs 
          ? '0 Active Plans • Step 0' 
          : 'Step 1 Active • 24h Goal',
        bullet1: !hasProfileInputs 
          ? 'Select a matched opportunity to start your guide' 
          : 'Hosted public demo page with live lead form',
        bullet2: !hasProfileInputs 
          ? '24–48h launch goal with zero capital required' 
          : 'Direct outreach proposal templates provided',
      },
    },
  ];

  const currentPreview = previews.find(p => p.id === activePreview) || previews[0];

  const personas = [
    {
      title: 'Solopreneurs & Developers',
      desc: 'Looking to build real micro-SaaS products without burning cash on expensive infrastructure.',
    },
    {
      title: 'Practical AI Practitioners',
      desc: 'Want to apply new AI models to real workflows rather than just chatting with prompts.',
    },
    {
      title: 'Action-Oriented Thinkers',
      desc: 'Prefer a clear step-by-step roadmap to launch a demo in 48 hours instead of endless planning.',
    },
    {
      title: 'Resourceful Builders',
      desc: 'Want to validate demand and test proof of concept for ₹0 before committing capital.',
    },
  ];

  return (
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-8 text-left">
      {/* SECTION 6 — THE PRODUCT IN ACTION */}
      <ScrollReveal className="space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <AnimatedBadge glow className="bg-peach-500/15 border-peach-500/30 text-peach-400">
            THE PRODUCT IN ACTION
          </AnimatedBadge>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight sm:leading-[1.15]">
            See how Opportunity OS works.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed pt-1">
            Move seamlessly from raw public signal to a working product roadmap.
          </p>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-navy-950/80 p-2 sm:p-2.5 rounded-2xl border border-white/10">
          {previews.map(p => {
            const Icon = p.icon;
            const isActive = activePreview === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePreview(p.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-mono font-bold transition-all ${
                  isActive
                    ? 'bg-peach-500 text-navy-950 shadow-lg shadow-peach-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Product Preview Surface */}
        <CardShimmerWrapper className="p-6 sm:p-8 border-white/15 bg-navy-950/90 space-y-6">
          <div className="space-y-2 border-b border-white/10 pb-5">
            <AnimatedBadge className="bg-peach-500/15 text-peach-300 border-peach-500/30">
              {currentPreview.badge}
            </AnimatedBadge>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 font-display pt-1 leading-snug">
              {currentPreview.headline}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-3xl leading-relaxed pt-1">
              {currentPreview.sub}
            </p>
          </div>

          {/* Dynamic Interactive Preview Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
            <div className="lg:col-span-7 bg-navy-900/80 p-7 rounded-2xl border border-white/10 space-y-5 shadow-inner">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {currentPreview.previewCard.title}
                </h4>
                <AnimatedBadge className={hasProfileInputs ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                  {currentPreview.previewCard.meta}
                </AnimatedBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs sm:text-sm text-slate-300 font-sans">
                <div className="flex items-start gap-3 bg-navy-950/70 p-4 rounded-xl border border-white/5">
                  {hasProfileInputs ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{currentPreview.previewCard.bullet1}</span>
                </div>
                <div className="flex items-start gap-3 bg-navy-950/70 p-4 rounded-xl border border-white/5">
                  <Zap className="h-4 w-4 text-peach-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{currentPreview.previewCard.bullet2}</span>
                </div>
              </div>
            </div>

            {/* Widget-Specific Live Animation Visual */}
            <div className="lg:col-span-5 space-y-4">
              {activePreview === 'discover' && (
                <AnimatedSparkline
                  title={hasProfileInputs ? "Signal Volume & Demand Index" : "Public Market Scan"}
                  value={hasProfileInputs ? "72,350" : "0 Signals"}
                  change={hasProfileInputs ? "+5.8%" : "Setup Required"}
                  data={hasProfileInputs ? [25, 42, 38, 65, 52, 84, 98, 88, 120, 145] : [0, 0, 0, 0, 0]}
                  strokeColor={hasProfileInputs ? "#f97316" : "#64748b"}
                  gradientId="preview-discover-sparkline"
                />
              )}
              {activePreview === 'opportunities' && (
                <div className="bg-navy-950/70 p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">Opportunity Score</span>
                    <AnimatedBadge glow className={hasProfileInputs ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                      {hasProfileInputs ? "Vector Fit Engine" : "Unconfigured Profile"}
                    </AnimatedBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center pt-1">
                    <div className="bg-navy-900/60 p-4 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono block">Vector Match</span>
                      <AnimatedMetric value={hasProfileInputs ? `${bestOpp?.matchScore || 95}%` : "0%"} className={`text-xl font-bold font-mono ${hasProfileInputs ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="bg-navy-900/60 p-4 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono block">Estimated Revenue</span>
                      <AnimatedMetric value={hasProfileInputs ? (bestOpp?.estimatedRevenue || "₹25,000") : "₹0"} suffix={hasProfileInputs ? "/mo" : ""} className={`text-xl font-bold font-mono ${hasProfileInputs ? 'text-peach-400' : 'text-slate-500'}`} />
                    </div>
                  </div>
                </div>
              )}
              {activePreview === 'combine' && (
                <AnimatedBarChart
                  title="Monthly Expenses vs Synergy Savings"
                  subtitle={hasProfileInputs ? `${toolCount} Profile Tools Connected` : "0 Tools Connected"}
                  data={hasProfileInputs ? [
                    { label: 'Cloud', value: 120, formattedValue: '$120' },
                    { label: 'APIs', value: 45, formattedValue: '$45' },
                    { label: 'Storage', value: 30, formattedValue: '$30' },
                    { label: 'Synergy', value: toolCount * 15, formattedValue: `$${toolCount * 15} USD (₹0)` },
                  ] : [
                    { label: 'Cloud', value: 0, formattedValue: '$0' },
                    { label: 'APIs', value: 0, formattedValue: '$0' },
                    { label: 'Storage', value: 0, formattedValue: '$0' },
                    { label: 'Synergy', value: 0, formattedValue: '$0' },
                  ]}
                  height={130}
                />
              )}
              {activePreview === 'progress' && (
                <div className="bg-navy-950/70 p-6 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">Execution Velocity</span>
                    <AnimatedBadge className={hasProfileInputs ? "bg-peach-500/20 text-peach-400 border-peach-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}>
                      {hasProfileInputs ? "+29.4%" : "0% Active"}
                    </AnimatedBadge>
                  </div>
                  <AnimatedSparkline
                    data={hasProfileInputs ? [10, 18, 32, 28, 55, 68, 92, 115] : [0, 0, 0, 0]}
                    strokeColor={hasProfileInputs ? "#10b981" : "#64748b"}
                    gradientId="preview-progress-sparkline"
                    height={85}
                  />
                </div>
              )}
            </div>
          </div>
        </CardShimmerWrapper>
      </ScrollReveal>

      {/* SECTION 7 — WHO IS THIS FOR? */}
      <ScrollReveal className="space-y-6 pt-4">
        <div className="space-y-4">
          <AnimatedBadge className="bg-peach-500/15 border-peach-500/30 text-peach-400">
            WHO IT IS FOR
          </AnimatedBadge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight leading-tight sm:leading-[1.15]">
            Built for people who want to create, not just browse.
          </h2>
        </div>

        <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pt-2">
          {personas.map((p, idx) => (
            <ScrollRevealItem key={idx}>
              <CardShimmerWrapper interactive className="p-7 flex flex-col justify-between h-full space-y-4">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-5 shrink-0" />
                <div className="my-auto flex flex-col justify-center items-start space-y-3 py-3 w-full">
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">{p.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-1">{p.desc}</p>
                </div>
              </CardShimmerWrapper>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </ScrollReveal>
    </section>
  );
};
