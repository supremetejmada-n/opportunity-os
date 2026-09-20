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
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    if (props.onMouseMove) props.onMouseMove(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    if (props.onMouseEnter) props.onMouseEnter(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    if (props.onMouseLeave) props.onMouseLeave(e);
  };

  const variantStyles: Record<GlassVariant, string> = {
    primary: 'glass-panel-primary',
    secondary: 'glass-panel-secondary',
    floating: 'glass-panel-floating',
    flat: 'bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl shadow-xl',
  };

  const interactiveStyles = interactive
    ? 'interactive-card cursor-pointer'
    : '';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden group transform-gpu will-change-transform ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      style={{
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
        transform: isHovered ? 'translateY(-5px) scale(1.015)' : 'translateY(0px) scale(1.0)',
        boxShadow: isHovered ? '0 20px 40px -15px rgba(0, 0, 0, 0.6)' : undefined,
      }}
      {...props}
    >
      {/* 3. Radial Border Light (The Spotlight Glow) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: 'radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.25), transparent 70%)',
        }}
      />
      
      {/* Inset top specular highlight stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
