import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { MagneticButton } from '../ui/MagneticButton.js';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal.js';

interface HomeClosingCTAProps {
  onEnterClick: () => void;
}

export const HomeClosingCTA: React.FC<HomeClosingCTAProps> = ({ onEnterClick }) => {
  return (
    <ScrollReveal className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 text-center">
      <GlassCard variant="floating" className="p-10 sm:p-16 border-white/15 bg-navy-950/90 relative overflow-hidden space-y-6 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/50 to-transparent pointer-events-none" />

        <div className="space-y-3 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/30 text-peach-400 text-xs font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>READY TO BUILD?</span>
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            Now, let's find something worth building.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
            Your personalized AI opportunity engine is ready. Explore live matches or trigger a new discovery scan now.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <MagneticButton
            onClick={onEnterClick}
            variant="primary"
            className="text-sm py-4 px-10 font-bold shadow-xl shadow-peach-500/30 border border-white/40 flex items-center gap-3"
          >
            <span>Enter Opportunity OS</span>
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </GlassCard>
    </ScrollReveal>
  );
};
