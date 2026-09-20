import React from 'react';

interface PresentationFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const PresentationFrame: React.FC<PresentationFrameProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative z-10 w-full max-w-6xl mx-auto rounded-3xl border border-white/12 bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden my-4 sm:my-8 [box-shadow:0_24px_64px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] ${className}`}>
      {/* Top specular liquid glass highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-20" />
      <div className="relative z-10 w-full h-full p-4 sm:p-8 lg:p-10">{children}</div>
    </div>
  );
};
