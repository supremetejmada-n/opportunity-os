import React from 'react';
import { motion } from 'framer-motion';

export interface BarData {
  label: string;
  value: number;
  formattedValue?: string;
  color?: string;
}

interface AnimatedBarChartProps {
  data?: BarData[];
  height?: number | string;
  className?: string;
  title?: string;
  subtitle?: string;
}

const defaultData: BarData[] = [
  { label: 'Jan', value: 45, formattedValue: '$4.5k' },
  { label: 'Feb', value: 62, formattedValue: '$6.2k' },
  { label: 'Mar', value: 38, formattedValue: '$3.8k' },
  { label: 'Apr', value: 85, formattedValue: '$8.5k' },
  { label: 'May', value: 74, formattedValue: '$7.4k' },
  { label: 'Jun', value: 95, formattedValue: '$9.5k' },
  { label: 'Jul', value: 110, formattedValue: '$11.0k' },
];

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data = defaultData,
  height = 160,
  className = '',
  title = 'Monthly Expenses & Velocity',
  subtitle = 'Staggered real-time data query feed',
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`w-full bg-navy-950/70 p-5 rounded-2xl border border-white/10 ${className}`}>
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div>
            {title && <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">{title}</h4>}
            {subtitle && <p className="text-[11px] text-slate-400 font-sans">{subtitle}</p>}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-peach-500/20 text-peach-400 border border-peach-500/30 text-[10px] font-mono font-bold">
            Live Feed
          </span>
        </div>
      )}

      <div className="flex items-end justify-between gap-2 sm:gap-3 pt-2" style={{ height }}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 bg-navy-900 border border-white/20 text-[10px] text-peach-300 font-mono rounded shadow-lg z-20 pointer-events-none whitespace-nowrap">
                {item.formattedValue || item.value}
              </div>

              {/* Animated Bar with scaleY: 0 -> 1 and transform-origin: bottom */}
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  height: `${heightPercent}%`,
                  transformOrigin: 'bottom',
                }}
                className={`w-full rounded-t-md transition-all group-hover:brightness-125 ${
                  item.color || 'bg-gradient-to-t from-peach-600/40 via-peach-500 to-amber-400'
                }`}
              />

              {/* X-axis Label */}
              <span className="text-[10px] font-mono text-slate-400 mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
