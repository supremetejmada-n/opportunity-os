import React, { useRef, useEffect } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  once?: boolean;
}

const StaggerContext = React.createContext<{
  smoothProgress: any;
} | null>(null);

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Kinetic velocity spring smoothing (stiffness: 140, damping: 28, restDelta: 0.001)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  // Entry scrubbed GPU transforms (0.0 to 0.4)
  const rotateX = useTransform(smoothProgress, [0, 0.4], [4, 0]);
  const scale = useTransform(smoothProgress, [0, 0.4], [0.98, 1.0]);
  const opacity = useTransform(smoothProgress, [0, 0.3], [0, 1]);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={className} style={{ perspective: '1200px' }}>
      <motion.div
        className="transform-gpu"
        style={{
          rotateX,
          scale,
          opacity,
          transformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

interface ScrollRevealStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  amount?: number;
  once?: boolean;
}

export const ScrollRevealStagger: React.FC<ScrollRevealStaggerProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <StaggerContext.Provider value={{ smoothProgress }}>
      <div ref={containerRef} className={className} style={{ perspective: '1200px' }}>
        {React.Children.map(children, (child, idx) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, { index: idx } as any);
        })}
      </div>
    </StaggerContext.Provider>
  );
};

export const ScrollRevealItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  index?: number;
}> = ({ children, className = '', index = 0 }) => {
  const context = React.useContext(StaggerContext);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress: localProgress } = useScroll({
    target: fallbackRef,
    offset: ['start end', 'end start'],
  });

  const localSmooth = useSpring(localProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const progress = context?.smoothProgress || localSmooth;

  // Differential Y-axis column parallax mapping profiles
  const parallaxProfiles = [
    [0, -40],
    [0, -60],
    [0, -30],
  ];
  const profile = parallaxProfiles[index % parallaxProfiles.length];

  const y = useTransform(progress, [0, 1], profile);
  const rotateX = useTransform(progress, [0, 0.4], [4, 0]);
  const scale = useTransform(progress, [0, 0.4], [0.98, 1.0]);
  const opacity = useTransform(progress, [0, 0.3], [0, 1]);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={fallbackRef} className={className} style={{ perspective: '1200px' }}>
      <motion.div
        className="transform-gpu"
        style={{
          y,
          rotateX,
          scale,
          opacity,
          transformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
