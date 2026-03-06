import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white',
  success: 'bg-emerald-500/20 text-emerald-300',
  warning: 'bg-yellow-500/20 text-yellow-300',
  danger: 'bg-red-500/20 text-red-300',
  info: 'bg-blue-500/20 text-blue-300',
};

export const Badge: React.FC<{ variant?: BadgeVariant; className?: string; children: React.ReactNode }> = ({
  variant = 'default',
  className = '',
  children,
}) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`.trim()}>
    {children}
  </span>
);
