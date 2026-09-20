import React from 'react';
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-navy-950/80 backdrop-blur-md border border-white/10 ${
        interactive ? 'hover:border-peach-500/40 hover:bg-navy-900/90 transition-all cursor-pointer' : ''
      } ${className}`}
    >
      {/* Sweeping diagonal shimmer highlight overlay during the first 400ms of entry */}
      <motion.div
        initial={{ x: '-100%', opacity: 1 }}
        whileInView={{ x: '200%', opacity: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{
          duration: 0.4,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transform -skew-x-12"
      />
      <div className="relative z-0 h-full">{children}</div>
    </motion.div>
  );
};
