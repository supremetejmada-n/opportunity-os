import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { HelpCircle, Sparkles, ArrowRight, Zap, Layers, Compass, Target, CheckCircle2 } from 'lucide-react';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';

export const WhyOpportunityOS: React.FC = () => {
  const steps = [
    {
      num: '01',
      label: "WHAT'S NEW",
      desc: 'Monitors public AI launches, developer tools, and demand signals continuously.',
      icon: Compass,
      color: 'text-peach-400',
    },
    {
      num: '02',
      label: "WHAT'S USEFUL",
      desc: 'Filters away social media hype to isolate genuine utility and buyer problems.',
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      num: '03',
      label: 'WHAT FITS YOU',
      desc: 'Compares opportunities directly against your accessible tools and active skills.',
      icon: Target,
      color: 'text-emerald-400',
    },
    {
      num: '04',
      label: 'WHAT CAN YOU BUILD',
      desc: 'Identifies practical micro-SaaS & workflow automation products you can launch.',
      icon: Layers,
      color: 'text-sky-400',
    },
    {
      num: '05',
      label: 'HOW CAN YOU START',
      desc: 'Provides a structured step-by-step action plan to go from concept to first buyer.',
      icon: CheckCircle2,
      color: 'text-purple-400',
    },
  ];

  return (
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-16 text-left">
      {/* SECTION 2 — THE PROBLEM */}
      <ScrollReveal className="space-y-8">
        <div className="space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-crimson-500/15 border border-crimson-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
            WHY THIS EXISTS
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            Discovering new tools is easy. Knowing what to build is hard.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            Every week brings new AI models, APIs, and frameworks. But most creators get stuck asking: <em className="text-peach-300 not-italic font-semibold">"What can I actually build with this that someone will pay for?"</em>
          </p>
        </div>

        <ScrollRevealStagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* The Noise Card */}
          <ScrollRevealItem>
            <GlassCard variant="secondary" className="p-7 space-y-4 border-crimson-500/30 bg-navy-950/70 h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-crimson-500/20 text-crimson-400 flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-lg font-bold text-slate-100">The Usual Struggle</h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="text-crimson-400 mt-0.5">•</span>
                  <span>Endless feed of AI news without clear practical utility.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-crimson-400 mt-0.5">•</span>
                  <span>Wasting time on ideas that require expensive infrastructure upfront.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-crimson-400 mt-0.5">•</span>
                  <span>Building in a vacuum without knowing if real buyers need it.</span>
                </li>
              </ul>
            </GlassCard>
          </ScrollRevealItem>

          {/* The Opportunity OS Answer */}
          <ScrollRevealItem>
            <GlassCard variant="primary" className="p-7 space-y-4 border-emerald-500/30 bg-navy-950/70 h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-slate-100">The Opportunity OS Way</h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>Connects live technology launches directly to your current skill profile.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>Prioritizes zero-cost execution using tools you already access for free.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>Delivers a step-by-step roadmap to build a demo in 24-48 hours.</span>
                </li>
              </ul>
            </GlassCard>
          </ScrollRevealItem>
        </ScrollRevealStagger>
      </ScrollReveal>

      {/* SECTION 3 — THE BIG IDEA FLOW */}
      <ScrollReveal className="space-y-8 pt-6">
        <div className="space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
            THE BIG IDEA
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
            How raw tech becomes a working business.
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            A simple, continuous flow that turns public opportunities into practical products.
          </p>
        </div>

        {/* 5-Step Visual Chain with Stagger */}
        <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <ScrollRevealItem key={idx}>
                <GlassCard
                  variant="floating"
                  interactive
                  className="p-5 flex flex-col justify-between gap-4 border-white/10 hover:border-peach-500/40 transition-all h-full"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-400">{step.num}</span>
                      <Icon className={`h-4 w-4 ${step.color}`} />
                    </div>
                    <h3 className="text-xs font-mono font-bold text-slate-100 tracking-wider">
                      {step.label}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {step.desc}
                    </p>
                  </div>
                </GlassCard>
              </ScrollRevealItem>
            );
          })}
        </ScrollRevealStagger>
      </ScrollReveal>
    </section>
  );
};
