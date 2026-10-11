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
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-8 text-left">
      {/* SECTION 2 — THE PROBLEM */}
      <ScrollReveal className="space-y-6">
        <div className="space-y-3 sm:space-y-4">
          <span className="px-4 py-1.5 rounded-full bg-crimson-500/15 border border-crimson-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
            WHY THIS EXISTS
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight sm:leading-[1.15]">
            Discovering new tools is easy. Knowing what to build is hard.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed pt-1">
            Every week brings new AI models, APIs, and frameworks. But most creators get stuck asking: <em className="text-peach-300 not-italic font-semibold">"What can I actually build with this that someone will pay for?"</em>
          </p>
        </div>

        <ScrollRevealStagger className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
          {/* The Noise Card */}
          <ScrollRevealItem className="h-full">
            <GlassCard variant="secondary" className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-navy-950/70 border border-crimson-500/30 min-h-[280px] h-full space-y-5">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-crimson-500/40 to-transparent mb-4 shrink-0" />
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-xl bg-crimson-500/20 text-crimson-400 flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">The Usual Struggle</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
                <ul className="space-y-3 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="text-crimson-400 mt-0.5">•</span>
                    <span>Endless feed of AI news without clear practical utility.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-crimson-400 mt-0.5">•</span>
                    <span>Wasting time on ideas that require expensive infrastructure upfront.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-crimson-400 mt-0.5">•</span>
                    <span>Building in a vacuum without knowing if real buyers need it.</span>
                  </li>
                </ul>
              </div>
            </GlassCard>
          </ScrollRevealItem>

          {/* The Opportunity OS Answer */}
          <ScrollRevealItem className="h-full">
            <GlassCard variant="secondary" className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-navy-950/70 border border-emerald-500/30 min-h-[280px] h-full space-y-5">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent mb-4 shrink-0" />
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">The Opportunity OS Way</h3>
              </div>
              <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
                <ul className="space-y-3 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Connects live technology launches directly to your current skill profile.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Prioritizes zero-cost execution using tools you already access for free.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>Delivers a step-by-step roadmap to build a demo in 24-48 hours.</span>
                  </li>
                </ul>
              </div>
            </GlassCard>
          </ScrollRevealItem>
        </ScrollRevealStagger>
      </ScrollReveal>

      {/* SECTION 3 — THE BIG IDEA FLOW */}
      <ScrollReveal className="space-y-6 pt-4">
        <div className="space-y-4">
          <span className="px-4 py-1.5 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
            THE BIG IDEA
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight leading-tight sm:leading-[1.15]">
            How raw tech becomes a working business.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed pt-1">
            A simple, continuous flow that turns public opportunities into practical products.
          </p>
        </div>

        {/* 5-Step Visual Chain with Stagger */}
        <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6 pt-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const stepGradients = [
              'via-peach-500/40',
              'via-amber-400/40',
              'via-emerald-400/40',
              'via-sky-400/40',
              'via-purple-400/40'
            ];
            return (
              <ScrollRevealItem key={idx}>
                <GlassCard
                  variant="floating"
                  interactive
                  className="p-6 flex flex-col justify-between border-white/10 hover:border-peach-500/40 transition-all h-full space-y-4"
                >
                  <div className={`w-full h-px bg-gradient-to-r from-transparent ${stepGradients[idx] || 'via-white/20'} to-transparent mb-5 shrink-0`} />
                  <div className="my-auto flex flex-col justify-center items-start space-y-4 py-3 w-full">
                    <div className="flex items-center justify-between w-full pb-1">
                      <span className="text-xs font-mono font-bold text-slate-400">{step.num}</span>
                      <Icon className={`h-4 w-4 ${step.color}`} />
                    </div>
                    <h3 className="text-xs font-mono font-bold text-slate-100 tracking-wider">
                      {step.label}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
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
