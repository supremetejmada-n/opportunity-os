import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { Compass, Target, Layers, Play, TrendingUp } from 'lucide-react';

export const ProductOutcomes: React.FC = () => {
  const outcomes = [
    {
      title: 'Discover useful things early',
      desc: 'Find high-potential AI tools and public demand signals before they become overcrowded.',
      icon: Compass,
      color: 'text-peach-400',
    },
    {
      title: 'Matches that fit your tools',
      desc: 'Get tailored recommendations based on the exact skills and free tools you already possess.',
      icon: Target,
      color: 'text-emerald-400',
    },
    {
      title: 'Tool Combination Synergy',
      desc: 'Combine 2–4 accessible tools into high-value zero-cost workflows without coding from scratch.',
      icon: Layers,
      color: 'text-amber-400',
    },
    {
      title: 'Practical Execution Plans',
      desc: 'Receive structured, step-by-step roadmaps to build working demos and reach buyers in days.',
      icon: Play,
      color: 'text-sky-400',
    },
    {
      title: 'Feedback-Driven Growth',
      desc: 'Log real buyer interactions and results to continuously refine your opportunity match vector.',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ];

  return (
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-10 text-left">
      <div className="space-y-3">
        <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
          PRODUCT OUTCOMES
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          What you actually get.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          No vague concepts or generic advice. Opportunity OS delivers tangible leverage for your builder journey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {outcomes.map((item, idx) => {
          const Icon = item.icon;
          return (
            <GlassCard
              key={idx}
              variant="secondary"
              interactive
              className="p-6 flex flex-col justify-between gap-5 border-white/10 hover:border-peach-500/40 transition-all"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="text-base font-bold text-slate-100 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {item.desc}
                </p>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
};
