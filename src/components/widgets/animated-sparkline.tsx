import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedSparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  gradientId?: string;
  title?: string;
  value?: string;
  change?: string;
}

const defaultData = [15, 28, 22, 45, 38, 62, 78, 70, 95, 110];

export const AnimatedSparkline: React.FC<AnimatedSparklineProps> = ({
  data = defaultData,
  width = 300,
  height = 80,
  className = '',
  strokeColor = '#f97316',
  gradientId = 'sparkline-gradient-default',
  title,
  value,
  change,
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 10;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((val - min) / range) * effectiveHeight;
    return { x, y };
  });

  const dLine = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const dArea = `${dLine} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className={`w-full bg-navy-950/70 p-4 rounded-2xl border border-white/10 ${className}`}>
      {(title || value || change) && (
        <div className="flex items-center justify-between mb-2">
          <div>
            {title && <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">{title}</span>}
            {value && <span className="text-lg font-bold text-slate-100 font-mono">{value}</span>}
          </div>
          {change && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
              {change}
            </span>
          )}
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Underline Gradient Area Fill - Fades in immediately after stroke completes (opacity 0 -> 0.35 at delay 1.1s) */}
          <motion.path
            d={dArea}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.35 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.4, delay: 1.1, ease: 'easeOut' }}
          />

          {/* Line Stroke Draw - Animates pathLength 0 -> 1 over 1.1s */}
          <motion.path
            d={dLine}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    </div>
  );
};
