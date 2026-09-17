import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface SpatialScrollContextType {
  scrollY: number;
  scrollProgress: number;
  mousePos: { x: number; y: number; normalizedX: number; normalizedY: number };
  mousePosRef: React.RefObject<{ x: number; y: number; normalizedX: number; normalizedY: number }>;
  isReducedMotion: boolean;
}

const defaultMousePos = { x: 0, y: 0, normalizedX: 0, normalizedY: 0 };
const defaultMousePosRef = { current: defaultMousePos };

const SpatialScrollContext = createContext<SpatialScrollContextType>({
  scrollY: 0,
  scrollProgress: 0,
  mousePos: defaultMousePos,
  mousePosRef: defaultMousePosRef,
  isReducedMotion: false,
});

export const useSpatialScroll = () => useContext(SpatialScrollContext);

export const SpatialScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const mousePosRef = useRef({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion setting
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handleMediaChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMediaChange);

    // Scroll listener with RAF throttle
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? currentScroll / totalHeight : 0;
        setScrollY(currentScroll);
        setScrollProgress(progress);
      });
    };

    // Mouse listener updating ref directly (zero React re-renders)
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      mousePosRef.current = {
        x: e.clientX,
        y: e.clientY,
        normalizedX: normX,
        normalizedY: normY,
      };
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <SpatialScrollContext.Provider
      value={{
        scrollY,
        scrollProgress,
        mousePos: mousePosRef.current,
        mousePosRef,
        isReducedMotion,
      }}
    >
      {children}
    </SpatialScrollContext.Provider>
  );
};

