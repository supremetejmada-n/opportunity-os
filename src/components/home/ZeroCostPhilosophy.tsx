import React from 'react';
import { GlassCard } from '../ui/GlassCard.js';
import { ShieldCheck, Compass, Code, DollarSign } from 'lucide-react';

export const ZeroCostPhilosophy: React.FC = () => {
  const steps = [
    { title: '1. Don’t spend first', desc: 'Avoid paid APIs or servers before testing demand.' },
    { title: '2. Explore first', desc: 'Scan free tiers, open models, and public tools you own.' },
    { title: '3. Build proof first', desc: 'Host a working demo in 24h to validate buyer interest.' },
    { title: '4. Then decide', desc: 'Invest money only after earning your first real buyer.' },
  ];

  return (
    <section className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16 text-left">
      <GlassCard variant="primary" className="p-8 sm:p-12 border-emerald-500/30 bg-navy-950/85 relative overflow-hidden space-y-8">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

        <div className="space-y-3 max-w-3xl">
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
            THE ₹0 PHILOSOPHY
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            Start with what you already have.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            Opportunity OS prioritizes workflows that can be explored, tested, or built with little or no upfront cost whenever possible.
          </p>
        </div>

        {/* 4-Step Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((item, idx) => (
            <div key={idx} className="bg-navy-900/80 p-5 rounded-2xl border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-emerald-400 block">{item.title}</span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </section>
  );
};
