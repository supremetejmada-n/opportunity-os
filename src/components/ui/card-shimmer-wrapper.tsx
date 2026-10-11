import React, { useRef, useEffect } from 'react';
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
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (!el) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / (rect.width || 1)) * 100;
      const y = ((clientY - rect.top) / (rect.height || 1)) * 100;
      cardRef.current.style.setProperty('--spotlight-x', `${x}%`);
      cardRef.current.style.setProperty('--spotlight-y', `${y}%`);
      cardRef.current.style.setProperty('--spotlight-opacity', '1');
    });
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / (rect.width || 1)) * 100;
    const y = ((e.clientY - rect.top) / (rect.height || 1)) * 100;
    cardRef.current.style.setProperty('--spotlight-x', `${x}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${y}%`);
    cardRef.current.style.setProperty('--spotlight-opacity', '1');
  };

  const handlePointerLeave = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.setProperty('--spotlight-opacity', '0');
    }
  };

  return (
    <motion.div
      ref={cardRef}
      data-glass-card="true"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      initial={{ opacity: 0, y: 25, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl glass-panel-primary ${
        interactive ? 'interactive-card cursor-pointer' : ''
      } ${className}`}
    >
      {/* Reactive Pointer Spotlight Highlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 hidden md:block"
        style={{
          opacity: 'var(--spotlight-opacity, 0)',
          background: 'radial-gradient(circle 160px at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255, 255, 255, 0.14), transparent 70%)',
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
