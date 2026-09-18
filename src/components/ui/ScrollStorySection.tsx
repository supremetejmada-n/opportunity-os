import React, { useEffect, useRef, useState } from 'react';
import { useSpatialScroll } from './SpatialScrollProvider.js';
import { SpatialStoryIndicator } from './SpatialStoryIndicator.js';
import { SpatialHeroOrb } from './SpatialHeroOrb.js';
import { GlassCard } from './GlassCard.js';

interface ScrollStorySectionProps {
  state1Content: React.ReactNode;
  state2Content: React.ReactNode;
  state3Content: React.ReactNode;
  state4Content: React.ReactNode;
  state5Content: React.ReactNode;
  className?: string;
}

function getStageMetrics(
  progress: number,
  start: number,
  peakStart: number,
  peakEnd: number,
  end: number
) {
  if (progress < start || progress > end) {
    return {
      opacity: 0,
      scale: 0.94,
      translateY: progress < start ? 24 : -24,
      blur: 8,
      pointerEvents: 'none' as const,
    };
  }

  let weight = 0;
  let translateY = 0;

  if (progress < peakStart) {
    const t = (progress - start) / (peakStart - start);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease out
    translateY = (1 - weight) * 24;
  } else if (progress <= peakEnd) {
    weight = 1;
    translateY = 0;
  } else {
    const t = (end - progress) / (end - peakEnd);
    weight = Math.sin(t * (Math.PI / 2)); // Smooth ease in
    translateY = (1 - weight) * -24;
  }

  const opacity = Math.min(1, Math.max(0, weight));
  const scale = 0.94 + opacity * 0.06;
  const blur = (1 - opacity) * 6;
  const pointerEvents = opacity > 0.4 ? ('auto' as const) : ('none' as const);

  return { opacity, scale, translateY, blur, pointerEvents };
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
  const { isReducedMotion } = useSpatialScroll();

  useEffect(() => {
    if (isReducedMotion) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!outerRef.current) return;
        const rect = outerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScrollableDistance = rect.height - windowHeight;

        if (totalScrollableDistance <= 0) return;

        // Current scroll offset relative to section top reaching top of viewport
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
  }, [isReducedMotion]);

  // If reduced motion is requested, render a clean readable continuous flow
  if (isReducedMotion) {
    return (
      <div className={`space-y-10 py-8 ${className}`}>
        <GlassCard variant="primary" className="p-6">{state1Content}</GlassCard>
        <GlassCard variant="secondary" className="p-6">{state2Content}</GlassCard>
        <GlassCard variant="secondary" className="p-6">{state3Content}</GlassCard>
        <GlassCard variant="secondary" className="p-6">{state4Content}</GlassCard>
        <GlassCard variant="floating" className="p-6">{state5Content}</GlassCard>
      </div>
    );
  }

  // Calculate 5 Stage Morphing Metrics
  const m1 = getStageMetrics(scrollProgress, 0.00, 0.00, 0.14, 0.22);
  const m2 = getStageMetrics(scrollProgress, 0.16, 0.24, 0.34, 0.42);
  const m3 = getStageMetrics(scrollProgress, 0.36, 0.44, 0.54, 0.62);
  const m4 = getStageMetrics(scrollProgress, 0.56, 0.64, 0.74, 0.82);
  const m5 = getStageMetrics(scrollProgress, 0.76, 0.84, 1.00, 1.00);

  // Background atmosphere color morphing
  const bgGlowOpacity = 0.45 + Math.sin(scrollProgress * Math.PI) * 0.35;
  const orbScale = 1.0 - scrollProgress * 0.25;
  const orbTranslateX = (scrollProgress - 0.5) * 160;
  const orbTranslateY = Math.sin(scrollProgress * Math.PI * 2) * 25;

  return (
    <div ref={outerRef} className={`relative w-full h-[450vh] ${className}`}>
      {/* PINNED STICKY VIEWPORT STAGE */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between py-4 sm:py-6 px-4 sm:px-8 z-10 select-none">
        
        {/* 1. SPATIAL ATMOSPHERE BACKGROUND (COLOR MORPHING) */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 85% 65% at 50% 40%, rgba(${
              scrollProgress < 0.25
                ? '255, 165, 134'
                : scrollProgress < 0.55
                ? '181, 26, 43'
                : scrollProgress < 0.80
                ? '84, 26, 46'
                : '36, 47, 73'
            }, ${bgGlowOpacity}) 0%, rgba(16, 22, 35, 0.96) 75%)`,
          }}
        />

        {/* 2. SPATIAL 3D OBJECT DEPTH LAYER (ALWAYS CONTINUOUSLY ANIMATED) */}
        <div 
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-100 ease-out"
          style={{
            transform: `translate3d(${orbTranslateX}px, ${orbTranslateY}px, 0px) scale(${orbScale})`,
            opacity: 0.85,
          }}
        >
          <SpatialHeroOrb className="w-80 h-80 sm:w-96 sm:h-96" />
        </div>

        {/* 3. TOP NAVIGATION INDICATOR STRIP */}
        <div className="relative z-20 flex items-center justify-between w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1 rounded-full bg-peach-500/15 border border-peach-500/35 text-peach-400 text-xs font-mono font-semibold uppercase tracking-wider">
              Product Story
            </span>
          </div>

          <SpatialStoryIndicator progress={scrollProgress} />

          <div className="text-right text-[11px] font-mono text-slate-400 hidden md:block">
            <span>Scroll Timeline</span>
            <strong className="text-peach-400 ml-2 font-bold">{Math.round(scrollProgress * 100)}%</strong>
          </div>
        </div>

        {/* 4. MAIN CENTRAL FLOATING GLASS FRAME */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-auto w-full max-w-5xl mx-auto min-h-0">
          <div 
            className="relative w-full h-full max-h-[75vh] sm:max-h-[80vh] rounded-2xl sm:rounded-3xl border border-white/20 bg-navy-950/85 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ease-out"
            style={{
              transform: `perspective(1200px) rotateX(${
                (1 - scrollProgress) * 10
              }deg) translateY(${
                Math.sin(scrollProgress * Math.PI) * -16
              }px)`,
              boxShadow: `
                0 30px 90px -20px rgba(10, 14, 24, 0.95),
                0 0 50px -10px rgba(255, 165, 134, ${0.2 + m2.opacity * 0.3}),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.25)
              `,
            }}
          >
            {/* Inner Content Area Layering 5 Morphing States */}
            <div className="relative w-full h-full p-6 sm:p-8 overflow-y-auto">
              
              {/* STATE 1 — DISCOVER */}
              <div
                className="absolute inset-0 p-6 sm:p-8 transition-all duration-300 ease-out flex flex-col justify-between"
                style={{
                  opacity: m1.opacity,
                  transform: `scale(${m1.scale}) translateY(${m1.translateY}px)`,
                  pointerEvents: m1.pointerEvents,
                  filter: `blur(${m1.blur}px)`,
                }}
              >
                {state1Content}
              </div>

              {/* STATE 2 — UNDERSTAND */}
              <div
                className="absolute inset-0 p-6 sm:p-8 transition-all duration-300 ease-out flex flex-col justify-between"
                style={{
                  opacity: m2.opacity,
                  transform: `scale(${m2.scale}) translateY(${m2.translateY}px)`,
                  pointerEvents: m2.pointerEvents,
                  filter: `blur(${m2.blur}px)`,
                }}
              >
                {state2Content}
              </div>

              {/* STATE 3 — COMBINE */}
              <div
                className="absolute inset-0 p-6 sm:p-8 transition-all duration-300 ease-out flex flex-col justify-between"
                style={{
                  opacity: m3.opacity,
                  transform: `scale(${m3.scale}) translateY(${m3.translateY}px)`,
                  pointerEvents: m3.pointerEvents,
                  filter: `blur(${m3.blur}px)`,
                }}
              >
                {state3Content}
              </div>

              {/* STATE 4 — ACT */}
              <div
                className="absolute inset-0 p-6 sm:p-8 transition-all duration-300 ease-out flex flex-col justify-between"
                style={{
                  opacity: m4.opacity,
                  transform: `scale(${m4.scale}) translateY(${m4.translateY}px)`,
                  pointerEvents: m4.pointerEvents,
                  filter: `blur(${m4.blur}px)`,
                }}
              >
                {state4Content}
              </div>

              {/* STATE 5 — LEARN */}
              <div
                className="absolute inset-0 p-6 sm:p-8 transition-all duration-300 ease-out flex flex-col justify-between"
                style={{
                  opacity: m5.opacity,
                  transform: `scale(${m5.scale}) translateY(${m5.translateY}px)`,
                  pointerEvents: m5.pointerEvents,
                  filter: `blur(${m5.blur}px)`,
                }}
              >
                {state5Content}
              </div>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM HINT STRIP */}
        <div className="relative z-20 text-center py-1">
          <p className="text-[11px] font-mono text-slate-400 tracking-wider">
            {scrollProgress >= 0.95
              ? 'Release to continue exploring Opportunity OS ↓'
              : 'Scroll to progress through story ↓'}
          </p>
        </div>
      </div>
    </div>
  );
};
