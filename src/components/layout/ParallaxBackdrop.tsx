import React, { useEffect, useState } from 'react';

interface ParallaxBackdropProps {
  className?: string;
}

export const ParallaxBackdrop: React.FC<ParallaxBackdropProps> = ({ className = '' }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const translateY = scrollY * 0.3;

  return (
    <div className={`fixed inset-0 pointer-events-none select-none z-0 overflow-hidden ${className}`}>
      <div
        className="w-full h-full flex flex-col justify-between items-center py-20 transition-transform duration-100 ease-out"
        style={{
          transform: `translate3d(0, ${-translateY}px, 0)`,
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
