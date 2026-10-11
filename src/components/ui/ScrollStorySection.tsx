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

// Compute continuous 3D spatial floating metrics tied directly to scroll progress.
// 5 equal steps: Discover (0-20%), Understand (20-40%), Combine (40-60%), Act (60-80%), Scale (80-100%)
function getStateMetrics(progress: number, stateIndex: number) {
  const p = Math.max(0, Math.min(1, progress));
  const stepInterval = 0.20;
  const center = stateIndex * stepInterval + 0.10;
  const delta = p - center;

  // Normalized distance relative to current step window (-1 to +1)
  const normDelta = delta / 0.12;

  if (Math.abs(normDelta) >= 1) {
    return {
      opacity: 0,
      translateY: normDelta > 0 ? -8 : 8,
      zIndex: 0,
      pointerEvents: 'none' as const,
    };
  }

  // Smooth cosine opacity crossfade (0 -> 1 -> 0)
  const opacity = Math.cos(normDelta * (Math.PI / 2));
  const translateY = (1 - opacity) * (normDelta > 0 ? -8 : 8);
  const zIndex = Math.round(opacity * 30);
  const pointerEvents = opacity > 0.4 ? ('auto' as const) : ('none' as const);

  return {
    opacity,
    translateY,
    zIndex,
    pointerEvents,
  };
}

// Spatial 3D Orb Position Interpolation (Centrally aligned floating backdrop)
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
  const bgGlowOpacity = 0.45 + Math.sin(scrollProgress * Math.PI) * 0.25;

  return (
    <div ref={outerRef} className={`relative w-full h-[230vh] ${className}`}>
      {/* PINNED STICKY VIEWPORT STAGE — BLENDS DIRECTLY INTO CANVAS */}
      <div className="sticky top-0 h-screen min-h-[100dvh] w-full overflow-hidden flex flex-col justify-between py-5 px-4 sm:px-8 lg:px-12 z-10 select-none bg-transparent">
        
        {/* 1. RESTORED ATMOSPHERIC SPOTLIGHT BACKGROUND (SOFT CENTRALLY ALIGNED RADIAL GLOW) */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(${
              scrollProgress < 0.20
                ? '255, 165, 134'
                : scrollProgress < 0.40
                ? '181, 26, 43'
                : scrollProgress < 0.60
                ? '84, 26, 46'
                : scrollProgress < 0.80
                ? '36, 47, 73'
                : '147, 51, 234'
            }, ${bgGlowOpacity}) 0%, transparent 75%)`,
          }}
        />

        {/* 2. SPATIAL 3D ORB LAYER (ALWAYS ROTATING CONTINUOUSLY IN OPEN SPACE) */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out overflow-visible"
          style={{
            transform: `translate3d(0px, ${orbTransform.y}px, 0px) scale(${orbTransform.scale})`,
            opacity: 0.88,
          }}
        >
          <SpatialHeroOrb className="w-80 h-80 sm:w-96 sm:h-96 overflow-visible" />
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

        {/* 4. MAIN STAGE VIEWPORT WITH SOFT CROSSFADE (FLOATING ON CANVAS) */}
        <div 
          className="relative z-10 flex-1 flex items-center justify-center w-full max-w-[1800px] mx-auto my-auto min-h-0"
        >
          {/* STATE 1 — DISCOVER */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6 transform-gpu"
            style={{
              opacity: m1.opacity,
              transform: `translate3d(0px, ${m1.translateY}px, 0px)`,
              pointerEvents: m1.pointerEvents,
              zIndex: m1.zIndex,
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px]">
              {state1Content}
            </div>
          </div>

          {/* STATE 2 — UNDERSTAND */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6 transform-gpu"
            style={{
              opacity: m2.opacity,
              transform: `translate3d(0px, ${m2.translateY}px, 0px)`,
              pointerEvents: m2.pointerEvents,
              zIndex: m2.zIndex,
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px]">
              {state2Content}
            </div>
          </div>

          {/* STATE 3 — COMBINE */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6 transform-gpu"
            style={{
              opacity: m3.opacity,
              transform: `translate3d(0px, ${m3.translateY}px, 0px)`,
              pointerEvents: m3.pointerEvents,
              zIndex: m3.zIndex,
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px]">
              {state3Content}
            </div>
          </div>

          {/* STATE 4 — ACT */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6 transform-gpu"
            style={{
              opacity: m4.opacity,
              transform: `translate3d(0px, ${m4.translateY}px, 0px)`,
              pointerEvents: m4.pointerEvents,
              zIndex: m4.zIndex,
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px]">
              {state4Content}
            </div>
          </div>

          {/* STATE 5 — SCALE */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6 transform-gpu"
            style={{
              opacity: m5.opacity,
              transform: `translate3d(0px, ${m5.translateY}px, 0px)`,
              pointerEvents: m5.pointerEvents,
              zIndex: m5.zIndex,
              willChange: 'opacity, transform',
            }}
          >
            <div className="w-full max-w-[1800px]">
              {state5Content}
            </div>
          </div>

        </div>

        {/* 5. BOTTOM HINT STRIP */}
        <div className="relative z-20 text-center py-1">
          <p className="text-[11px] font-mono text-slate-400 tracking-wider">
            {scrollProgress >= 0.90
              ? 'Scroll to view What you actually get →'
              : 'Scroll to scrub spatial product story ↓'}
          </p>
        </div>
      </div>
    </div>
  );
};
