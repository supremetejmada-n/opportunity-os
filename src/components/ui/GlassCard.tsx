import React, { useRef, useState, useEffect } from 'react';

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
  const frameRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

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
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
      cardRef.current.style.setProperty('--spotlight-opacity', '1');
    });

    if (props.onPointerMove) props.onPointerMove(e);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    setIsHovered(true);
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
      cardRef.current.style.setProperty('--spotlight-opacity', '1');
    }
    if (props.onPointerEnter) props.onPointerEnter(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.setProperty('--spotlight-opacity', '0');
    }
    setIsHovered(false);
    if (props.onPointerLeave) props.onPointerLeave(e);
  };

  const variantStyles: Record<GlassVariant, string> = {
    primary: 'metal-panel-primary',
    secondary: 'metal-panel-secondary',
    floating: 'glass-panel-floating',
    flat: 'bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl shadow-xl',
  };

  const interactiveStyles = interactive
    ? 'interactive-card cursor-pointer'
    : '';

  return (
    <div
      ref={cardRef}
      data-glass-card="true"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`relative overflow-hidden group transform-gpu will-change-transform ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      style={{
        transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-2px) scale(1.008)' : 'translateY(0px) scale(1.0)',
        boxShadow: isHovered ? '0 16px 36px -12px rgba(0, 0, 0, 0.55)' : undefined,
      }}
      {...props}
    >
      {/* Radial Border Light (Spotlight Glow) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: 'radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.25), transparent 70%)',
        }}
      />
      
      {/* Inset top specular highlight stroke */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      <div className="relative z-10 w-full h-full flex flex-col justify-between min-w-0">{children}</div>
    </div>
  );
};
