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

// Compute smooth stage metrics (Opacity, Scale, TranslateX/Y/Z, RotateX/Y, Blur)
function getStageMetrics(
  progress: number,
  start: number,
  peakStart: number,
  peakEnd: number,
  end: number,
  stageIndex: number
) {
  if (progress < start || progress > end) {
    const isPast = progress > end;
    return {
      opacity: 0,
      scale: isPast ? 0.75 : 0.82,
      translateY: isPast ? -160 : 160,
      translateX: isPast ? (stageIndex % 2 === 0 ? -120 : 120) : (stageIndex % 2 === 0 ? 120 : -120),
      translateZ: isPast ? -250 : -180,
      rotateX: isPast ? -20 : 20,
      rotateY: isPast ? (stageIndex % 2 === 0 ? 15 : -15) : (stageIndex % 2 === 0 ? -15 : 15),
      blur: 14,
      pointerEvents: 'none' as const,
    };
  }

  let weight = 0;
  let t = 0;

  if (progress < peakStart) {
    t = (progress - start) / (peakStart - start);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease out
  } else if (progress <= peakEnd) {
    weight = 1;
    t = 1;
  } else {
    t = (end - progress) / (end - peakEnd);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease in
  }

  const opacity = Math.min(1, Math.max(0, weight));
  const scale = 0.82 + opacity * 0.18;
  const translateY = (1 - opacity) * (progress < peakStart ? 140 : -140);
  const translateX = (1 - opacity) * (progress < peakStart ? (stageIndex % 2 === 0 ? 100 : -100) : (stageIndex % 2 === 0 ? -100 : 100));
  const translateZ = (1 - opacity) * -180;
  const rotateX = (1 - opacity) * (progress < peakStart ? 18 : -18);
  const rotateY = (1 - opacity) * (stageIndex % 2 === 0 ? 12 : -12);
  const blur = (1 - opacity) * 12;
  const pointerEvents = opacity > 0.4 ? ('auto' as const) : ('none' as const);

  return { opacity, scale, translateY, translateX, translateZ, rotateX, rotateY, blur, pointerEvents };
}

// Spatial 3D Orb Position Interpolation based on Scroll Progress
function getOrbSpatialTransform(progress: number) {
  // Stage 1 (0.00 - 0.20): Center Top prominent
  // Stage 2 (0.20 - 0.40): Left side floating depth
  // Stage 3 (0.40 - 0.60): Center backdrop powering tool web
  // Stage 4 (0.60 - 0.80): Right side top illuminating roadmap
  // Stage 5 (0.80 - 1.00): Center top vector core
  let x = 0;
  let y = -20;
  let z = 0;
  let scale = 1.35;

  if (progress <= 0.20) {
    const t = progress / 0.20;
    x = t * -280;
    y = -20 + t * -40;
    z = t * -120;
    scale = 1.35 - t * 0.45;
  } else if (progress <= 0.40) {
    const t = (progress - 0.20) / 0.20;
    x = -280 + t * 280;
    y = -60 + t * -20;
    z = -120 + t * -100;
    scale = 0.90 + t * 0.35;
  } else if (progress <= 0.60) {
    const t = (progress - 0.40) / 0.20;
    x = t * 320;
    y = -80 + t * -20;
    z = -220 + t * 140;
    scale = 1.25 - t * 0.35;
  } else if (progress <= 0.80) {
    const t = (progress - 0.60) / 0.20;
    x = 320 - t * 320;
    y = -100 + t * 70;
    z = -80 + t * 80;
    scale = 0.90 + t * 0.20;
  } else {
    x = 0;
    y = -30;
    z = 0;
    scale = 1.10;
  }

  return { x, y, z, scale };
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

  // Compute metrics for all 5 morphing spatial states
  const m1 = getStageMetrics(scrollProgress, 0.00, 0.00, 0.14, 0.22, 1);
  const m2 = getStageMetrics(scrollProgress, 0.16, 0.24, 0.34, 0.42, 2);
  const m3 = getStageMetrics(scrollProgress, 0.36, 0.44, 0.54, 0.62, 3);
  const m4 = getStageMetrics(scrollProgress, 0.56, 0.64, 0.74, 0.82, 4);
  const m5 = getStageMetrics(scrollProgress, 0.76, 0.84, 1.00, 1.00, 5);

  const orbTransform = getOrbSpatialTransform(scrollProgress);
  const bgGlowOpacity = 0.45 + Math.sin(scrollProgress * Math.PI) * 0.35;

  return (
    <div ref={outerRef} className={`relative w-full h-[500vh] ${className}`}>
      {/* PINNED STICKY VIEWPORT STAGE */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between py-5 px-4 sm:px-8 z-10 select-none bg-navy-950">
        
        {/* 1. DYNAMIC SPATIAL ATMOSPHERE BACKGROUND (COLOR & LIGHT MORPHING) */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 50% 40%, rgba(${
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

        {/* 2. SPATIAL 3D ORB LAYER (ALWAYS ROTATING CONTINUOUSLY, POSITIONING IN 3D SPACE) */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out"
          style={{
            transform: `translate3d(${orbTransform.x}px, ${orbTransform.y}px, ${orbTransform.z}px) scale(${orbTransform.scale})`,
            opacity: 0.92,
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

        {/* 4. MAIN FULL-STAGE SPATIAL PERSPECTIVE VIEWPORT (3D CHOREOGRAPHY) */}
        <div 
          className="relative z-10 flex-1 flex items-center justify-center my-auto w-full max-w-6xl mx-auto min-h-0"
          style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
        >
          {/* STATE 1 — DISCOVER */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center p-4 sm:p-6 transition-all duration-300 ease-out"
            style={{
              opacity: m1.opacity,
              transform: `translate3d(${m1.translateX}px, ${m1.translateY}px, ${m1.translateZ}px) scale(${m1.scale}) rotateX(${m1.rotateX}deg) rotateY(${m1.rotateY}deg)`,
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
              transform: `translate3d(${m2.translateX}px, ${m2.translateY}px, ${m2.translateZ}px) scale(${m2.scale}) rotateX(${m2.rotateX}deg) rotateY(${m2.rotateY}deg)`,
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
              transform: `translate3d(${m3.translateX}px, ${m3.translateY}px, ${m3.translateZ}px) scale(${m3.scale}) rotateX(${m3.rotateX}deg) rotateY(${m3.rotateY}deg)`,
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
              transform: `translate3d(${m4.translateX}px, ${m4.translateY}px, ${m4.translateZ}px) scale(${m4.scale}) rotateX(${m4.rotateX}deg) rotateY(${m4.rotateY}deg)`,
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
              transform: `translate3d(${m5.translateX}px, ${m5.translateY}px, ${m5.translateZ}px) scale(${m5.scale}) rotateX(${m5.rotateX}deg) rotateY(${m5.rotateY}deg)`,
              pointerEvents: m5.pointerEvents,
              filter: `blur(${m5.blur}px)`,
            }}
          >
            <div className="w-full max-w-4xl p-6 sm:p-10 rounded-3xl border border-purple-500/30 bg-navy-950/85 backdrop-blur-2xl shadow-2xl shadow-purple-500/10">
              {state5Content}
            </div>
          </div>
        </div>

        {/* 5. BOTTOM HINT & INSTRUCTION STRIP */}
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
