import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { Sparkles, Quote, Code, Heart, Compass } from 'lucide-react';
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from '../ui/ScrollReveal.js';

export const CreatorStory: React.FC = () => {
  return (
    <ScrollReveal className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 text-left">
      <GlassCard variant="primary" className="p-8 sm:p-14 border-peach-500/30 bg-navy-950/90 relative overflow-hidden space-y-10 shadow-2xl shadow-peach-500/10">
        {/* Top Specular Glass Edge Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/50 to-transparent pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-bold tracking-widest uppercase">
              THE PERSON BEHIND THE IDEA
            </span>
            <span className="text-xs font-mono text-slate-400">Founder Story</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-peach-400" />
            <span>Opportunity OS • Authentic Craft</span>
          </div>
        </div>

        {/* Main 12-Column Founder Composition */}
        <ScrollRevealStagger className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Authentic Real Creator Photo Frame */}
          <ScrollRevealItem className="lg:col-span-5 relative group">
            {/* Soft Ambient Warm Glow Behind Photo */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-peach-500/20 via-burgundy-900/30 to-emerald-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-navy-900 shadow-2xl">
              {/* REAL CREATOR PHOTO */}
              <img
                src="/creator_photo.png"
                alt="Supreme Tej Mada - Creator of Opportunity OS"
                className="w-full h-[460px] sm:h-[540px] object-cover object-top filter grayscale contrast-[1.08] group-hover:contrast-125 transition-all duration-500"
              />

              {/* Glass Overlay Light Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/20 to-transparent opacity-80 pointer-events-none" />

              {/* Floating Glass Founder Badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-navy-950/85 backdrop-blur-xl p-4 rounded-xl border border-white/15 flex items-center justify-between shadow-2xl">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-100 font-display">Supreme Tej Mada</h4>
                  <p className="text-[11px] font-mono text-peach-400">Creator & Lead Architect</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-peach-500/20 text-peach-300 border border-peach-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  FOUNDER
                </span>
              </div>
            </div>
          </ScrollRevealItem>

          {/* Right Column: Authentic Founder Story & Mission */}
          <ScrollRevealItem className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <Quote className="h-10 w-10 text-peach-500/40" />
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-[1.15]">
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

            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-display text-2xl font-bold text-slate-100 block">— Tej</span>
                <span className="text-xs font-mono text-slate-400 block">Supreme Tej Mada • Creator of Opportunity OS</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                <Heart className="h-3.5 w-3.5 fill-current" />
                <span>Built for Builders</span>
              </div>
            </div>
          </ScrollRevealItem>
        </ScrollRevealStagger>
      </GlassCard>
    </ScrollReveal>
  );
};
