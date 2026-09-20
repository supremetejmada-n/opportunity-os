import React, { useEffect, useRef, useState } from 'react';
import { SpatialStoryIndicator } from './SpatialStoryIndicator.js';
import { SpatialHeroOrb } from './SpatialHeroOrb.js';

interface ScrollStorySectionProps {
  state1Content: React.ReactNode;
  state2Content: React.ReactNode;
  state3Content: React.ReactNode;
  state4Content: React.ReactNode;
  state5Content: React.ReactNode;
  className?: string;
}

// Compute smooth continuous cross-fade metrics for states.
// Guarantees crisp non-overlapping step cards with ZERO text ghosting and ZERO blank screen gap.
function getStateMetrics(progress: number, stateIndex: number) {
  const centers = [0.10, 0.30, 0.50, 0.70, 0.90];
  const p = Math.max(0, Math.min(1, progress));
  const center = centers[stateIndex];
  const distance = Math.abs(p - center);

  const solidRadius = 0.07;
  const fadeRadius = 0.13;

  // State 5 stays 100% visible once reached until section unpins
  if (stateIndex === 4 && p >= center) {
    return {
      opacity: 1,
      scale: 1,
      translateY: 0,
      blur: 0,
      zIndex: 50,
      pointerEvents: 'auto' as const,
    };
  }

  let opacity = 0;
  let direction: 'before' | 'center' | 'after' = 'center';

  if (distance <= solidRadius) {
    opacity = 1;
    direction = 'center';
  } else if (distance < fadeRadius) {
    const t = (distance - solidRadius) / (fadeRadius - solidRadius);
    opacity = Math.cos(t * (Math.PI / 2));
    direction = p > center ? 'after' : 'before';
  } else {
    opacity = 0;
    direction = p > center ? 'after' : 'before';
  }

  opacity = Math.max(0, Math.min(1, opacity));
  const scale = 0.98 + opacity * 0.02;
  const translateY = (1 - opacity) * (direction === 'after' ? -12 : 12);
  const blur = (1 - opacity) * 2;
  const zIndex = Math.round(opacity * 20);
  const pointerEvents = opacity > 0.5 ? ('auto' as const) : ('none' as const);

  return { opacity, scale, translateY, blur, zIndex, pointerEvents };
}

// Spatial 3D Orb Position Interpolation (Centrally aligned glowing backdrop)
function getOrbSpatialTransform(progress: number) {
  const y = (progress - 0.5) * -20;
  const scale = 1.05 + Math.sin(progress * Math.PI) * 0.10;
  return { x: 0, y, scale };
}

export const ScrollStorySection: React.FC<ScrollStorySectionProps> = ({
  state1Content,
  state2Content,
  state3Content,
  state4Content,
  state5Content,
  className = '',
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!outerRef.current) return;
        const rect = outerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollableDistance = rect.height - windowHeight;

        if (totalScrollableDistance <= 0) return;

        const currentScroll = -rect.top;
        const rawProgress = currentScroll / totalScrollableDistance;
        const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
        setScrollProgress(clampedProgress);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const m1 = getStateMetrics(scrollProgress, 0);
  const m2 = getStateMetrics(scrollProgress, 1);
  const m3 = getStateMetrics(scrollProgress, 2);
  const m4 = getStateMetrics(scrollProgress, 3);
  const m5 = getStateMetrics(scrollProgress, 4);

  const orbTransform = getOrbSpatialTransform(scrollProgress);
  const bgGlowOpacity = 0.35 + Math.sin(scrollProgress * Math.PI) * 0.25;

  return (
    <div ref={outerRef} className={`relative w-full h-[250vh] ${className}`}>
      {/* PINNED STICKY VIEWPORT STAGE */}
      <div className="sticky top-0 h-screen min-h-[100dvh] w-full overflow-hidden flex flex-col justify-between py-5 px-4 sm:px-8 lg:px-12 z-10 select-none bg-navy-950">
        
        {/* 1. ATMOSPHERIC GRADIENT BACKGROUND MATCHING REFERENCE VIDEO PALETTE */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(${
              scrollProgress < 0.25
                ? '255, 165, 134'
                : scrollProgress < 0.50
                ? '181, 26, 43'
                : scrollProgress < 0.75
                ? '84, 26, 46'
                : '36, 47, 73'
            }, ${bgGlowOpacity}) 0%, rgba(10, 14, 24, 0.98) 80%)`,
          }}
        />

        {/* 2. SPATIAL 3D ORB LAYER (ALWAYS ROTATING CONTINUOUSLY, CENTRALLY ALIGNED) */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out"
          style={{
            transform: `translate3d(0px, ${orbTransform.y}px, 0px) scale(${orbTransform.scale})`,
            opacity: 0.85,
          }}
        >
          <SpatialHeroOrb className="w-80 h-80 sm:w-96 sm:h-96" />
        </div>

        {/* 3. TOP NAVIGATION INDICATOR & TIMELINE STRIP */}
        <div className="relative z-20 flex items-center justify-between w-full max-w-[1800px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-bold uppercase tracking-wider">
              Product Story
            </span>
          </div>

          <SpatialStoryIndicator progress={scrollProgress} />

          <div className="text-right text-[11px] font-mono text-slate-400 hidden sm:block">
            <span>Timeline</span>
            <strong className="text-peach-400 ml-2 font-bold num-tabular">{Math.round(scrollProgress * 100)}%</strong>
          </div>
        </div>

        {/* 4. MAIN STAGE VIEWPORT (FULL-WIDTH DESKTOP CANVAS max-w-[1800px]) */}
        <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-[1800px] mx-auto my-auto min-h-0">
          
          {/* STATE 1 — DISCOVER */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m1.opacity,
              transform: `translate3d(0px, ${m1.translateY}px, 0px) scale(${m1.scale})`,
              pointerEvents: m1.pointerEvents,
              zIndex: m1.zIndex,
              filter: m1.blur > 0.1 ? `blur(${m1.blur}px)` : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-white/20 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl">
              {state1Content}
            </div>
          </div>

          {/* STATE 2 — UNDERSTAND */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m2.opacity,
              transform: `translate3d(0px, ${m2.translateY}px, 0px) scale(${m2.scale})`,
              pointerEvents: m2.pointerEvents,
              zIndex: m2.zIndex,
              filter: m2.blur > 0.1 ? `blur(${m2.blur}px)` : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-emerald-500/30 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl shadow-emerald-500/10">
              {state2Content}
            </div>
          </div>

          {/* STATE 3 — COMBINE */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m3.opacity,
              transform: `translate3d(0px, ${m3.translateY}px, 0px) scale(${m3.scale})`,
              pointerEvents: m3.pointerEvents,
              zIndex: m3.zIndex,
              filter: m3.blur > 0.1 ? `blur(${m3.blur}px)` : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-crimson-500/30 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl shadow-crimson-500/10">
              {state3Content}
            </div>
          </div>

          {/* STATE 4 — ACT */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m4.opacity,
              transform: `translate3d(0px, ${m4.translateY}px, 0px) scale(${m4.scale})`,
              pointerEvents: m4.pointerEvents,
              zIndex: m4.zIndex,
              filter: m4.blur > 0.1 ? `blur(${m4.blur}px)` : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-amber-500/30 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl shadow-amber-500/10">
              {state4Content}
            </div>
          </div>

          {/* STATE 5 — LEARN (STAYS FULLY VISIBLE UNTIL UNPINNING — ZERO BLANK SCREEN!) */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m5.opacity,
              transform: `translate3d(0px, ${m5.translateY}px, 0px) scale(${m5.scale})`,
              pointerEvents: m5.pointerEvents,
              zIndex: m5.zIndex,
              filter: m5.blur > 0.1 ? `blur(${m5.blur}px)` : 'none',
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-purple-500/30 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl shadow-purple-500/10">
              {state5Content}
            </div>
          </div>

        </div>

        {/* 5. BOTTOM HINT STRIP */}
        <div className="relative z-20 text-center py-1">
          <p className="text-[11px] font-mono text-slate-400 tracking-wider">
            {scrollProgress >= 0.90
              ? 'Scroll to view Worth Knowing →'
              : 'Scroll to scrub spatial product story ↓'}
          </p>
        </div>
      </div>
    </div>
  );
};

