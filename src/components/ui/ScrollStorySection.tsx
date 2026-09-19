import React, { useEffect, useRef, useState } from 'react';
import { useSpatialScroll } from './SpatialScrollProvider.js';
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

// Compute clean linear stage metrics matching reference video vertical flow
function getStageMetrics(
  progress: number,
  start: number,
  peakStart: number,
  peakEnd: number,
  end: number
) {
  if (progress < start || progress > end) {
    const isPast = progress > end;
    return {
      opacity: 0,
      scale: isPast ? 0.94 : 0.96,
      translateY: isPast ? -70 : 70,
      translateZ: isPast ? -40 : -30,
      blur: 6,
      pointerEvents: 'none' as const,
    };
  }

  let weight = 0;

  if (progress < peakStart) {
    const t = (progress - start) / (peakStart - start);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease out entry
  } else if (progress <= peakEnd) {
    weight = 1;
  } else {
    const t = (end - progress) / (end - peakEnd);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease in exit
  }

  const opacity = Math.min(1, Math.max(0, weight));
  const scale = 0.96 + opacity * 0.04;
  const translateY = (1 - opacity) * (progress < peakStart ? 60 : -60);
  const translateZ = (1 - opacity) * -35;
  const blur = (1 - opacity) * 5;
  const pointerEvents = opacity > 0.4 ? ('auto' as const) : ('none' as const);

  return { opacity, scale, translateY, translateZ, blur, pointerEvents };
}

// Spatial 3D Orb Position Interpolation (Central vertical depth alignment matching reference video)
function getOrbSpatialTransform(progress: number) {
  const y = (progress - 0.5) * -30;
  const z = Math.sin(progress * Math.PI) * -40;
  const scale = 1.1 + Math.sin(progress * Math.PI) * 0.12;

  return { x: 0, y, z, scale };
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

  // Compute linear stage metrics evenly mapped over the 220vh track
  const m1 = getStageMetrics(scrollProgress, 0.00, 0.00, 0.14, 0.22);
  const m2 = getStageMetrics(scrollProgress, 0.16, 0.24, 0.34, 0.42);
  const m3 = getStageMetrics(scrollProgress, 0.36, 0.44, 0.54, 0.62);
  const m4 = getStageMetrics(scrollProgress, 0.56, 0.64, 0.74, 0.82);
  const m5 = getStageMetrics(scrollProgress, 0.76, 0.84, 1.00, 1.00);

  const orbTransform = getOrbSpatialTransform(scrollProgress);
  const bgGlowOpacity = 0.40 + Math.sin(scrollProgress * Math.PI) * 0.30;

  return (
    <div ref={outerRef} className={`relative w-full h-[220vh] ${className}`}>
      {/* PINNED STICKY VIEWPORT STAGE */}
      <div className="sticky top-0 h-screen min-h-[100dvh] w-full overflow-hidden flex flex-col justify-between py-6 px-4 sm:px-8 z-10 select-none bg-navy-950">
        
        {/* 1. ATMOSPHERIC GRADIENT BACKGROUND MATCHING REFERENCE VIDEO PALETTE */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(${
              scrollProgress < 0.25
                ? '255, 165, 134'
                : scrollProgress < 0.55
                ? '181, 26, 43'
                : scrollProgress < 0.80
                ? '84, 26, 46'
                : '36, 47, 73'
            }, ${bgGlowOpacity}) 0%, rgba(10, 14, 24, 0.98) 80%)`,
          }}
        />

        {/* 2. SPATIAL 3D ORB LAYER (ALWAYS ROTATING CONTINUOUSLY, CENTRALLY ALIGNED) */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out"
          style={{
            transform: `translate3d(${orbTransform.x}px, ${orbTransform.y}px, ${orbTransform.z}px) scale(${orbTransform.scale})`,
            opacity: 0.90,
          }}
        >
          <SpatialHeroOrb className="w-80 h-80 sm:w-96 sm:h-96" />
        </div>

        {/* 3. TOP NAVIGATION INDICATOR & TIMELINE STRIP */}
        <div className="relative z-20 flex items-center justify-between w-full max-w-6xl mx-auto">
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

        {/* 4. MAIN STAGE PERSPECTIVE VIEWPORT (VERTICAL FLOW MATCHING REFERENCE VIDEO) */}
        <div 
          className="relative z-10 flex-1 flex items-center justify-center my-auto w-full max-w-5xl mx-auto min-h-0"
          style={{ perspective: '1200px' }}
        >
          {/* STATE 1 — DISCOVER */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m1.opacity,
              transform: `translate3d(0px, ${m1.translateY}px, ${m1.translateZ}px) scale(${m1.scale})`,
              pointerEvents: m1.pointerEvents,
              filter: `blur(${m1.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-white/20 bg-navy-950/85 backdrop-blur-2xl shadow-2xl">
              {state1Content}
            </div>
          </div>

          {/* STATE 2 — UNDERSTAND */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m2.opacity,
              transform: `translate3d(0px, ${m2.translateY}px, ${m2.translateZ}px) scale(${m2.scale})`,
              pointerEvents: m2.pointerEvents,
              filter: `blur(${m2.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-emerald-500/30 bg-navy-950/85 backdrop-blur-2xl shadow-2xl shadow-emerald-500/10">
              {state2Content}
            </div>
          </div>

          {/* STATE 3 — COMBINE */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m3.opacity,
              transform: `translate3d(0px, ${m3.translateY}px, ${m3.translateZ}px) scale(${m3.scale})`,
              pointerEvents: m3.pointerEvents,
              filter: `blur(${m3.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-crimson-500/30 bg-navy-950/85 backdrop-blur-2xl shadow-2xl shadow-crimson-500/10">
              {state3Content}
            </div>
          </div>

          {/* STATE 4 — ACT */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m4.opacity,
              transform: `translate3d(0px, ${m4.translateY}px, ${m4.translateZ}px) scale(${m4.scale})`,
              pointerEvents: m4.pointerEvents,
              filter: `blur(${m4.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-amber-500/30 bg-navy-950/85 backdrop-blur-2xl shadow-2xl shadow-amber-500/10">
              {state4Content}
            </div>
          </div>

          {/* STATE 5 — LEARN */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m5.opacity,
              transform: `translate3d(0px, ${m5.translateY}px, ${m5.translateZ}px) scale(${m5.scale})`,
              pointerEvents: m5.pointerEvents,
              filter: `blur(${m5.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-purple-500/30 bg-navy-950/85 backdrop-blur-2xl shadow-2xl shadow-purple-500/10">
              {state5Content}
            </div>
          </div>
        </div>

        {/* 5. BOTTOM HINT STRIP */}
        <div className="relative z-20 text-center py-1">
          <p className="text-[11px] font-mono text-slate-400 tracking-wider">
            {scrollProgress >= 0.95
              ? 'Release to continue exploring Opportunity OS ↓'
              : 'Scroll to scrub spatial product story ↓'}
          </p>
        </div>
      </div>
    </div>
  );
};
