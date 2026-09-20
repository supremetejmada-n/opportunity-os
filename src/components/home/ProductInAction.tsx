import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { NavTab } from '../layout/Navbar.js';
import { Compass, Sparkles, Layers, TrendingUp, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { MagneticButton } from '../ui/MagneticButton.js';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';
import { CardShimmerWrapper } from '../ui/card-shimmer-wrapper.js';
import { AnimatedMetric } from '../widgets/animated-metric.js';
import { AnimatedBarChart } from '../widgets/animated-bar-chart.js';
import { AnimatedSparkline } from '../widgets/animated-sparkline.js';
import { AnimatedBadge } from '../widgets/animated-badge.js';

interface ProductInActionProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const ProductInAction: React.FC<ProductInActionProps> = ({ onNavigateTab }) => {
  const [activePreview, setActivePreview] = useState<'discover' | 'opportunities' | 'combine' | 'progress'>('opportunities');

  const previews = [
    {
      id: 'discover' as const,
      tab: 'discover' as NavTab,
      label: "What's New",
      icon: Compass,
      headline: 'Live Public Signals',
      sub: 'Real-time vector scan across developer platforms, public APIs, and emerging market demands.',
      badge: 'Live Scanner',
      previewCard: {
        title: 'OpenAI Realtime API & Speech Webhooks',
        meta: '94% Vector Fit • High Demand',
        bullet1: 'Automate voice customer support workflows',
        bullet2: 'Zero-cost dev setup with free API credits',
      },
    },
    {
      id: 'opportunities' as const,
      tab: 'opportunities' as NavTab,
      label: 'Opportunities',
      icon: Sparkles,
      headline: 'Ranked Fit Engine',
      sub: 'Evaluated against your accessible tools, skills, and zero-cost constraints.',
      badge: '#1 Match',
      previewCard: {
        title: 'AI Document Audit & Automation Micro-SaaS',
        meta: '98% Fit Score • ₹5,000–₹25,000/mo Potential',
        bullet1: 'Combines Python, SQLite & free LLM tier',
        bullet2: 'Working demo build time: ~1-2 days',
      },
    },
    {
      id: 'combine' as const,
      tab: 'combine' as NavTab,
      label: 'Combine Tools',
      icon: Layers,
      headline: 'Tool Combiner Synergy',
      sub: 'Links 2–4 tools you already access into high-value zero-cost workflows.',
      badge: 'Zero-Cost Synergy',
      previewCard: {
        title: 'Python + Vite + ChatGPT API + SQLite',
        meta: '4 Tools Connected • ₹0 Upfront Cost',
        bullet1: 'Automated data extraction & email alerts',
        bullet2: 'Full source code template ready to launch',
      },
    },
    {
      id: 'progress' as const,
      tab: 'progress' as NavTab,
      label: 'Your Plan',
      icon: TrendingUp,
      headline: '6-Phase Execution Roadmap',
      sub: 'Actionable steps to build a demo, reach 10 target buyers, and log your progress.',
      badge: 'Execution Roadmap',
      previewCard: {
        title: 'Phase 1: Learn Demand → Phase 2: Build Demo',
        meta: 'Step 2 of 6 Active • 24h Goal',
        bullet1: 'Hosted public demo page with live lead form',
        bullet2: 'Direct outreach proposal templates provided',
      },
    },
  ];

  const currentPreview = previews.find(p => p.id === activePreview) || previews[1];

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
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-16 text-left">
      {/* SECTION 6 — THE PRODUCT IN ACTION */}
      <ScrollReveal className="space-y-8">
        <div className="space-y-3">
          <AnimatedBadge glow className="bg-peach-500/15 border-peach-500/30 text-peach-400">
            THE PRODUCT IN ACTION
          </AnimatedBadge>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            See how Opportunity OS works.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Move seamlessly from raw public signal to a working product roadmap.
          </p>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-navy-950/80 p-2 rounded-2xl border border-white/10">
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
        <CardShimmerWrapper className="p-8 sm:p-10 border-white/15 bg-navy-950/90 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <AnimatedBadge className="bg-peach-500/15 text-peach-300 border-peach-500/30">
                {currentPreview.badge}
              </AnimatedBadge>
              <h3 className="text-2xl font-bold text-slate-100 font-display pt-1">
                {currentPreview.headline}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-sans">
                {currentPreview.sub}
              </p>
            </div>

            <MagneticButton
              onClick={() => onNavigateTab(currentPreview.tab)}
              variant="primary"
              className="text-xs py-3 px-6 font-bold shadow-lg shrink-0"
            >
              <span>Launch {currentPreview.label}</span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>

          {/* Dynamic Interactive Preview Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 bg-navy-900/80 p-6 rounded-2xl border border-white/10 space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <h4 className="text-base sm:text-lg font-bold text-slate-100">
                  {currentPreview.previewCard.title}
                </h4>
                <AnimatedBadge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {currentPreview.previewCard.meta}
                </AnimatedBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-300 font-sans">
                <div className="flex items-start gap-2 bg-navy-950/70 p-3.5 rounded-xl border border-white/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{currentPreview.previewCard.bullet1}</span>
                </div>
                <div className="flex items-start gap-2 bg-navy-950/70 p-3.5 rounded-xl border border-white/5">
                  <Zap className="h-4 w-4 text-peach-400 shrink-0 mt-0.5" />
                  <span>{currentPreview.previewCard.bullet2}</span>
                </div>
              </div>
            </div>

            {/* Widget-Specific Live Animation Visual */}
            <div className="lg:col-span-5 space-y-3">
              {activePreview === 'discover' && (
                <AnimatedSparkline
                  title="Signal Volume & Demand Index"
                  value="72,350"
                  change="+5.8%"
                  data={[25, 42, 38, 65, 52, 84, 98, 88, 120, 145]}
                  strokeColor="#f97316"
                  gradientId="preview-discover-sparkline"
                />
              )}
              {activePreview === 'opportunities' && (
                <div className="bg-navy-950/70 p-5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">Opportunity Score</span>
                    <AnimatedBadge glow className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Ease Update v0.1
                    </AnimatedBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 font-mono block">Vector Match</span>
                      <AnimatedMetric value="98.4%" className="text-xl font-bold font-mono text-emerald-400" />
                    </div>
                    <div className="bg-navy-900/60 p-3 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-400 font-mono block">Estimated Revenue</span>
                      <AnimatedMetric value="₹25,000" suffix="/mo" className="text-xl font-bold font-mono text-peach-400" />
                    </div>
                  </div>
                </div>
              )}
              {activePreview === 'combine' && (
                <AnimatedBarChart
                  title="Monthly Expenses vs Synergy Savings"
                  subtitle="Staggered upward growth"
                  data={[
                    { label: 'Cloud', value: 120, formattedValue: '$120' },
                    { label: 'APIs', value: 45, formattedValue: '$45' },
                    { label: 'Storage', value: 30, formattedValue: '$30' },
                    { label: 'Synergy', value: 0, formattedValue: '$0 USD (₹0)' },
                  ]}
                  height={130}
                />
              )}
              {activePreview === 'progress' && (
                <div className="bg-navy-950/70 p-5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">Execution Velocity</span>
                    <AnimatedBadge className="bg-peach-500/20 text-peach-400 border-peach-500/30">
                      +29.4%
                    </AnimatedBadge>
                  </div>
                  <AnimatedSparkline
                    data={[10, 18, 32, 28, 55, 68, 92, 115]}
                    strokeColor="#10b981"
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
      <ScrollReveal className="space-y-8 pt-6">
        <div className="space-y-3">
          <AnimatedBadge className="bg-peach-500/15 border-peach-500/30 text-peach-400">
            WHO IT IS FOR
          </AnimatedBadge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            Built for people who want to create, not just browse.
          </h2>
        </div>

        <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {personas.map((p, idx) => (
            <ScrollRevealItem key={idx}>
              <CardShimmerWrapper interactive className="p-6 space-y-3 h-full">
                <h3 className="text-base font-bold text-slate-100">{p.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{p.desc}</p>
              </CardShimmerWrapper>
            </ScrollRevealItem>
          ))}
        </ScrollRevealStagger>
      </ScrollReveal>
    </section>
  );
};

