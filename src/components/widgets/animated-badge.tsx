import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedBadgeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  glow?: boolean;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  children,
  className = '',
  delay = 0.2,
  glow = false,
}) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 22,
        delay,
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-shadow ${
        glow ? 'shadow-[0_0_12px_rgba(249,115,22,0.35)]' : ''
      } ${className}`}
    >
      {glow && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-peach-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-peach-500"></span>
        </span>
      )}
      {children}
    </motion.span>
  );
};
