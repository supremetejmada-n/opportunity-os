import React from 'react';

interface PresentationFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const PresentationFrame: React.FC<PresentationFrameProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative z-10 w-full max-w-6xl mx-auto rounded-3xl border border-white/10 bg-navy-950/80 backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden my-4 sm:my-8 ${className}`}>
      {/* Top subtle specular glass edge highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-peach-500/30 to-transparent pointer-events-none z-20" />
      <div className="relative z-10 w-full h-full p-4 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
};
