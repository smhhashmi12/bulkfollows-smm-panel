import React from 'react';

type IconBoxVariant = 'primary' | 'blue' | 'success';

const variantClasses: Record<IconBoxVariant, string> = {
  primary: 'bg-purple-500/20 border border-purple-500/40 text-purple-200 shadow-[0_0_20px_rgba(124,58,237,0.4)]',
  blue: 'bg-blue-500/20 border border-blue-500/40 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.35)]',
  success: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
};

export const IconBox: React.FC<{ variant?: IconBoxVariant; className?: string; children: React.ReactNode }> = ({
  variant = 'primary',
  className = '',
  children,
}) => (
  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${variantClasses[variant]} ${className}`.trim()}>
    {children}
  </div>
);
