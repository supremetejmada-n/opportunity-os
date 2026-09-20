import React, { useEffect, useRef } from 'react';

interface ParallaxBackdropProps {
  className?: string;
}

export const ParallaxBackdrop: React.FC<ParallaxBackdropProps> = ({ className = '' }) => {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!innerRef.current) return;
        const translateY = window.scrollY * 0.3;
        innerRef.current.style.transform = `translate3d(0, ${-translateY}px, 0)`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 pointer-events-none select-none z-0 overflow-hidden ${className}`}
      style={{ contain: 'strict' }}
    >
      <div
        ref={innerRef}
        className="w-full h-full flex flex-col justify-between items-center py-20 will-change-transform"
        style={{
          transform: 'translate3d(0, 0px, 0)',
        }}
      >
        <span className="font-display font-black text-6xl sm:text-8xl lg:text-[11rem] text-slate-400/[0.04] tracking-widest uppercase whitespace-nowrap">
          OPPORTUNITY OS
        </span>
        <span className="font-display font-black text-6xl sm:text-8xl lg:text-[11rem] text-slate-400/[0.04] tracking-widest uppercase whitespace-nowrap">
          WORTH BUILDING
        </span>
        <span className="font-display font-black text-6xl sm:text-8xl lg:text-[11rem] text-slate-400/[0.04] tracking-widest uppercase whitespace-nowrap">
          ZERO COST EXECUTION
        </span>
        <span className="font-display font-black text-6xl sm:text-8xl lg:text-[11rem] text-slate-400/[0.04] tracking-widest uppercase whitespace-nowrap">
          THE CREATOR
        </span>
      </div>
    </div>
  );
};
