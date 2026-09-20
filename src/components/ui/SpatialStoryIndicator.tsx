import React from 'react';

interface SpatialStoryIndicatorProps {
  progress: number; // 0.00 -> 1.00
  className?: string;
}

const STAGES = [
  { id: 'discover', number: '01', label: 'Discover' },
  { id: 'understand', number: '02', label: 'Understand' },
  { id: 'combine', number: '03', label: 'Combine' },
  { id: 'act', number: '04', label: 'Act' },
  { id: 'learn', number: '05', label: 'Learn' },
];

export const SpatialStoryIndicator: React.FC<SpatialStoryIndicatorProps> = ({
  progress,
  className = '',
}) => {
  // Determine active stage index
  // 0.00 - 0.18 -> 0
  // 0.18 - 0.38 -> 1
  // 0.38 - 0.58 -> 2
  // 0.58 - 0.78 -> 3
  // 0.78 - 1.00 -> 4
  let activeIdx = 0;
  if (progress >= 0.80) activeIdx = 4;
  else if (progress >= 0.60) activeIdx = 3;
  else if (progress >= 0.40) activeIdx = 2;
  else if (progress >= 0.20) activeIdx = 1;

  return (
    <div
      className={`flex items-center gap-2 sm:gap-4 px-4 py-2 rounded-full bg-navy-950/80 border border-white/10 backdrop-blur-md shadow-lg pointer-events-none select-none ${className}`}
    >
      {STAGES.map((stage, idx) => {
        const isActive = idx === activeIdx;
        const isPassed = idx < activeIdx;

        return (
          <React.Fragment key={stage.id}>
            <div className="flex items-center gap-1.5 transition-all duration-300">
              <span
                className={`text-[10px] font-mono font-bold transition-colors duration-300 ${
                  isActive
                    ? 'text-peach-400'
                    : isPassed
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                {stage.number}
              </span>
              <span
                className={`text-xs font-sans font-semibold tracking-wide transition-all duration-300 hidden sm:inline ${
                  isActive
                    ? 'text-white scale-105'
                    : isPassed
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                {stage.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-peach-500 shadow-sm shadow-peach-500/50 animate-pulse" />
              )}
            </div>

            {idx < STAGES.length - 1 && (
              <div
                className={`h-0.5 w-3 sm:w-6 rounded-full transition-colors duration-300 ${
                  isPassed ? 'bg-peach-500/50' : 'bg-slate-800'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
