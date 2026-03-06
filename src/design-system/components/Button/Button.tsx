import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'ds-btn-primary',
  secondary: 'ds-btn-secondary',
  ghost: 'bg-transparent border border-transparent hover:bg-white/5 text-white',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`.trim()}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" /> : iconLeft}
      <span>{children}</span>
      {iconRight}
    </button>
  );
};
