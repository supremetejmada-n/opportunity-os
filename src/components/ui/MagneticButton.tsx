import React, { useRef, useEffect } from 'react';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  strength = 0.25,
  onClick,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch' || !buttonRef.current) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (clientX - centerX) * strength;
      const deltaY = (clientY - centerY) * strength;

      const shineX = ((clientX - rect.left) / (rect.width || 1)) * 100;
      const shineY = ((clientY - rect.top) / (rect.height || 1)) * 100;

      buttonRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      buttonRef.current.style.transition = 'transform 100ms cubic-bezier(0.16, 1, 0.3, 1)';
      const shineEl = buttonRef.current.querySelector('.specular-shine') as HTMLElement;
      if (shineEl) {
        shineEl.style.opacity = '1';
        shineEl.style.background = `radial-gradient(circle 60px at ${shineX}% ${shineY}%, rgba(255, 255, 255, 0.3), transparent 80%)`;
      }
    });

    if (props.onPointerMove) props.onPointerMove(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (!buttonRef.current) return;
    buttonRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    buttonRef.current.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)';
    const shineEl = buttonRef.current.querySelector('.specular-shine') as HTMLElement;
    if (shineEl) {
      shineEl.style.opacity = '0';
    }
    if (props.onPointerLeave) props.onPointerLeave(e);
  };

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  }[variant];

  return (
    <button
      type={props.type || "button"}
      ref={buttonRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      className={`relative overflow-hidden group select-none ${variantClasses} ${className}`}
      {...props}
    >
      {/* Specular cursor reflection overlay */}
      <div
        className="specular-shine pointer-events-none absolute inset-0 transition-opacity duration-200 opacity-0"
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
