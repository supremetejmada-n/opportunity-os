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
// Exiting cards float upward (-40px), scale down (0.96), blur (6px), and fade.
// Entering cards rise from below (+50px), scale into focus (0.96 -> 1.0), unblur (6px -> 0), and tilt slightly (4deg rotateX).
function getStateMetrics(progress: number, stateIndex: number) {
  const centers = [0.10, 0.30, 0.50, 0.70, 0.90];
  const p = Math.max(0, Math.min(1, progress));
  const center = centers[stateIndex];
  const stepInterval = 0.20;
  const delta = p - center;

  // State 5 stays 100% visible once reached until section unpins
  if (stateIndex === 4 && p >= center) {
    return {
      opacity: 1,
      scale: 1,
      translateY: 0,
      rotateX: 0,
      blur: 0,
      zIndex: 50,
      pointerEvents: 'auto' as const,
    };
  }

  // Normalized progress relative to current step center (-1 to +1)
  const normDelta = Math.max(-1, Math.min(1, delta / stepInterval));

  // Continuous smooth opacity curve
  const opacity = Math.max(0, Math.cos(normDelta * (Math.PI / 2)));

  let translateY = 0;
  let rotateX = 0;
  let scale = 1;
  let blur = 0;

  if (normDelta > 0) {
    // Exiting step (floating upward)
    const factor = Math.sin(normDelta * (Math.PI / 2)); // 0 -> 1
    translateY = -40 * factor;
    rotateX = -3 * factor; // -3deg tilt on exit
    scale = 1 - 0.04 * factor; // 1.0 -> 0.96
    blur = 6 * factor; // 0 -> 6px
  } else if (normDelta < 0) {
    // Entering step (rising from below)
    const factor = Math.sin(-normDelta * (Math.PI / 2)); // 0 -> 1
    translateY = 50 * factor;
    rotateX = 4 * factor; // +4deg tilt on entry
    scale = 1 - 0.04 * factor; // 0.96 -> 1.0
    blur = 6 * factor; // 6px -> 0
  }

  const zIndex = Math.round(opacity * 20);
  const pointerEvents = opacity > 0.4 ? ('auto' as const) : ('none' as const);

  return {
    opacity,
    scale,
    translateY,
    rotateX,
    blur,
    zIndex,
    pointerEvents,
  };
}

// Spatial 3D Orb Position Interpolation (Centrally aligned glowing backdrop)
function getOrbSpatialTransform(progress: number) {
  const y = (progress - 0.5) * -25;
  const scale = 1.05 + Math.sin(progress * Math.PI) * 0.12;
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

        {/* 4. MAIN STAGE VIEWPORT WITH 3D PERSPECTIVE (FULL-WIDTH DESKTOP CANVAS max-w-[1800px]) */}
        <div 
          className="relative z-10 flex-1 flex items-center justify-center w-full max-w-[1800px] mx-auto my-auto min-h-0"
          style={{ perspective: '1200px' }}
        >
          
          {/* STATE 1 — DISCOVER */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m1.opacity,
              transform: `translate3d(0px, ${m1.translateY}px, 0px) scale(${m1.scale}) rotateX(${m1.rotateX}deg)`,
              pointerEvents: m1.pointerEvents,
              zIndex: m1.zIndex,
              filter: m1.blur > 0.1 ? `blur(${m1.blur}px)` : 'none',
              willChange: 'opacity, transform, filter',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="w-full max-w-[1800px] p-6 sm:p-8 lg:p-10 rounded-3xl border border-white/20 bg-[#070a0f]/95 backdrop-blur-2xl shadow-2xl shadow-peach-500/5">
              {state1Content}
            </div>
          </div>

          {/* STATE 2 — UNDERSTAND */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-3 sm:p-6"
            style={{
              opacity: m2.opacity,
              transform: `translate3d(0px, ${m2.translateY}px, 0px) scale(${m2.scale}) rotateX(${m2.rotateX}deg)`,
              pointerEvents: m2.pointerEvents,
              zIndex: m2.zIndex,
              filter: m2.blur > 0.1 ? `blur(${m2.blur}px)` : 'none',
              willChange: 'opacity, transform, filter',
              transformStyle: 'preserve-3d',
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
              transform: `translate3d(0px, ${m3.translateY}px, 0px) scale(${m3.scale}) rotateX(${m3.rotateX}deg)`,
              pointerEvents: m3.pointerEvents,
              zIndex: m3.zIndex,
              filter: m3.blur > 0.1 ? `blur(${m3.blur}px)` : 'none',
              willChange: 'opacity, transform, filter',
              transformStyle: 'preserve-3d',
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
              transform: `translate3d(0px, ${m4.translateY}px, 0px) scale(${m4.scale}) rotateX(${m4.rotateX}deg)`,
              pointerEvents: m4.pointerEvents,
              zIndex: m4.zIndex,
              filter: m4.blur > 0.1 ? `blur(${m4.blur}px)` : 'none',
              willChange: 'opacity, transform, filter',
              transformStyle: 'preserve-3d',
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
              transform: `translate3d(0px, ${m5.translateY}px, 0px) scale(${m5.scale}) rotateX(${m5.rotateX}deg)`,
              pointerEvents: m5.pointerEvents,
              zIndex: m5.zIndex,
              filter: m5.blur > 0.1 ? `blur(${m5.blur}px)` : 'none',
              willChange: 'opacity, transform, filter',
              transformStyle: 'preserve-3d',
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


