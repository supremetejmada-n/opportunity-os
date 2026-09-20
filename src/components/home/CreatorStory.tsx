import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { Sparkles, Quote, User, Code, Heart, Compass } from 'lucide-react';

export const CreatorStory: React.FC = () => {
  return (
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 text-left">
      <GlassCard variant="primary" className="p-8 sm:p-14 border-peach-500/30 bg-navy-950/90 relative overflow-hidden space-y-10 shadow-2xl shadow-peach-500/10">
        {/* Specular top glass edge */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/50 to-transparent pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-bold tracking-widest uppercase">
              THE CREATOR
            </span>
            <span className="text-xs font-mono text-slate-400">Founder & Builder</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-peach-400" />
            <span>Built with purpose • Opportunity OS</span>
          </div>
        </div>

        {/* Main Founder Story Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Founder Personal Visual Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-navy-900/80 border border-white/10 relative overflow-hidden space-y-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-burgundy-900 via-peach-500/30 to-emerald-500/20 p-1 shadow-xl border border-peach-500/40 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-navy-950 flex items-center justify-center text-peach-400 font-display font-extrabold text-3xl">
                TM
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-100 font-display">Supreme Tej Mada</h3>
              <p className="text-xs font-mono text-peach-400 font-semibold">Creator & Lead Architect</p>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed max-w-sm">
              Passionate about bridging high-speed AI tools with zero-cost personal execution.
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-navy-950/80 px-4 py-2 rounded-full border border-white/5">
              <Code className="h-3.5 w-3.5 text-peach-400" />
              <span>Independent Developer</span>
            </div>
          </div>

          {/* Right: Narrative Story Block */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <Quote className="h-10 w-10 text-peach-500/40" />
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
                "I built this because I was tired of watching great ideas get lost in technical noise."
              </h2>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              <p>
                Every week, dozens of new AI models and APIs land on the web. Everyone talks about the hype, but almost nobody shows what a single person with free tools can actually build and launch.
              </p>
              <p>
                I experienced this exact frustration: discovering incredible tools, but taking days just to figure out what practical product could be created with zero upfront budget.
              </p>
              <p>
                Opportunity OS exists to fix that. It evaluates real-world tech releases against your personal skills and accessible tools, giving you a clear, actionable path to turn curiosity into working products.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-display text-lg font-bold text-slate-100 block">— Tej</span>
                <span className="text-xs font-mono text-slate-400 block">Creator of Opportunity OS</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Heart className="h-3.5 w-3.5 fill-current" />
                <span>Built for Builders</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
};
