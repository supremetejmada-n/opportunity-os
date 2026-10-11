import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { Compass, Target, Layers, Play, TrendingUp } from 'lucide-react';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';

export const ProductOutcomes: React.FC = () => {
  const outcomes = [
    {
      title: 'Discover useful tools early',
      desc: 'Find trending AI tools and client needs before everyone else.',
      icon: Compass,
      color: 'text-peach-400',
    },
    {
      title: 'Matches that fit your tools',
      desc: 'Get recommendations based on the free tools and skills you already have.',
      icon: Target,
      color: 'text-emerald-400',
    },
    {
      title: 'Combine Simple Tools',
      desc: 'Combine tools like ChatGPT, Canva & WhatsApp into ready-to-sell services without coding.',
      icon: Layers,
      color: 'text-amber-400',
    },
    {
      title: 'Practical Action Plans',
      desc: 'Receive simple step-by-step guides to launch your service and reach buyers in 2–3 days.',
      icon: Play,
      color: 'text-sky-400',
    },
    {
      title: 'Track Your Growth',
      desc: 'Track your clients, earnings, and progress step-by-step.',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ];

  return (
    <ScrollReveal className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-8 text-left">
      <div className="space-y-4">
        <span className="px-4 py-1.5 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase">
          PRODUCT OUTCOMES
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight sm:leading-[1.15]">
          What you actually get.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed pt-1">
          No vague concepts or generic advice. Opportunity OS delivers tangible leverage for your builder journey.
        </p>
      </div>

      <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 pt-2">
        {outcomes.map((item, idx) => {
          const Icon = item.icon;
          const lineGradients = [
            'via-peach-500/40',
            'via-emerald-400/40',
            'via-amber-400/40',
            'via-sky-400/40',
            'via-purple-400/40'
          ];
          return (
            <ScrollRevealItem key={idx}>
              <GlassCard
                variant="secondary"
                interactive
                className="p-7 flex flex-col justify-between border-white/10 hover:border-peach-500/40 transition-all h-full space-y-5"
              >
                <div className={`w-full h-px bg-gradient-to-r from-transparent ${lineGradients[idx] || 'via-white/20'} to-transparent mb-5 shrink-0`} />
                <div className="my-auto flex flex-col justify-center items-start space-y-4 py-3 w-full">
                  <div className="w-11 h-11 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-center mb-1">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans pt-1">
                    {item.desc}
                  </p>
                </div>
              </GlassCard>
            </ScrollRevealItem>
          );
        })}
      </ScrollRevealStagger>
    </ScrollReveal>
  );
};
