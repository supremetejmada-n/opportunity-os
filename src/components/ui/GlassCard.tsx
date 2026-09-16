import React from 'react';

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
  const baseStyles = 'relative overflow-hidden transition-all duration-200 var(--ease-out)';

  const variantStyles: Record<GlassVariant, string> = {
    primary:
      'bg-slate-950/75 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 rounded-2xl',
    secondary:
      'bg-slate-900/45 backdrop-blur-md border border-white/5 shadow-lg shadow-black/40 rounded-xl',
    floating:
      'bg-indigo-950/40 backdrop-blur-sm border border-indigo-500/30 shadow-md rounded-lg',
    flat:
      'bg-slate-950/90 border border-slate-800/80 rounded-xl',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-950/30 active:scale-[0.985]'
    : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {/* Internal Specular Highlight Reflection */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-70" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
