import React from 'react';

type CardVariant = 'default' | 'glow' | 'outline';

interface CardProps {
  variant?: CardVariant;
  hoverEffect?: boolean;
  className?: string;
  children: React.ReactNode;
}

const CardRoot: React.FC<CardProps> = ({
  variant = 'default',
  hoverEffect = true,
  className = '',
  children,
}) => {
  const variantClass =
    variant === 'glow'
      ? 'ds-card'
      : variant === 'outline'
      ? 'ds-glass'
      : 'ds-card';

  const hoverClass = hoverEffect ? 'ds-card-hover' : '';

  return (
    <div className={`${variantClass} ${hoverClass} ${className}`.trim()}>
      {children}
    </div>
  );
};

const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`px-6 pt-6 ${className}`.trim()}>{children}</div>
);

const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`px-6 pb-6 ${className}`.trim()}>{children}</div>
);

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
});
