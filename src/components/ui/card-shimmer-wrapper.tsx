import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface CardShimmerWrapperProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const CardShimmerWrapper: React.FC<CardShimmerWrapperProps> = ({
  children,
  className = '',
  onClick,
  interactive = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpotlight({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setSpotlight(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 25, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl glass-panel-primary ${
        interactive ? 'interactive-card cursor-pointer' : ''
      } ${className}`}
    >
      {/* Pillar 3: Reactive Pointer Spotlight Highlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 hidden md:block"
        style={{
          opacity: spotlight.opacity,
          background: `radial-gradient(circle 160px at ${spotlight.x}% ${spotlight.y}%, rgba(255, 255, 255, 0.14), transparent 70%)`,
        }}
      />

      {/* Sweeping diagonal shimmer highlight overlay during entry */}
      <motion.div
        initial={{ x: '-100%', opacity: 1 }}
        whileInView={{ x: '200%', opacity: 0 }}
        viewport={{ once: false, amount: 0.25 }}
        transition={{
          duration: 0.4,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transform -skew-x-12"
      />

      {/* Top subtle specular edge stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      <div className="relative z-0 h-full">{children}</div>
    </motion.div>
  );
};
