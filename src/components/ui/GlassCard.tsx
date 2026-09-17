import React, { useRef, useState } from 'react';

export type GlassVariant = 'primary' | 'secondary' | 'floating' | 'flat';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'secondary',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shinePos, setShinePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShinePos({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setShinePos(prev => ({ ...prev, opacity: 0 }));
  };

  const variantStyles: Record<GlassVariant, string> = {
    primary: 'glass-panel-primary',
    secondary: 'glass-panel-secondary',
    floating: 'glass-panel-floating',
    flat: 'bg-navy-950/90 border border-slate-800/80 rounded-xl',
  };

  const interactiveStyles = interactive
    ? 'interactive-card cursor-pointer'
    : '';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {/* Specular pointer tracking light highlight */}
      {interactive && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: shinePos.opacity,
            background: `radial-gradient(circle 120px at ${shinePos.x}% ${shinePos.y}%, rgba(255, 165, 134, 0.18), transparent 70%)`,
          }}
        />
      )}
      
      {/* Top subtle specular glass edge line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};
