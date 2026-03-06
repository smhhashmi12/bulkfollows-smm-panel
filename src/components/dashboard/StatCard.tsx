import React from 'react';
import { useCurrency } from '../../lib/CurrencyContext';
import { Card, IconBox } from '../../design-system';

interface StatCardProps {
    title: string;
    value?: string;
    numericValue?: number; // Optional numeric value for currency conversion
    // Fix: Changed JSX.Element to React.ReactNode to resolve namespace error.
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'purple' | 'red';
}

const colorClasses = {
    green: 'success',
    blue: 'blue',
    purple: 'primary',
    red: 'primary',
} as const;

const StatCard: React.FC<StatCardProps> = ({ title, value, numericValue, icon, color }) => {
    const { formatAmount } = useCurrency();
    
    // Use formatted currency amount if numericValue provided, otherwise use string value
    const displayValue = numericValue !== undefined ? formatAmount(numericValue) : (value ?? '--');
    
    return (
        <Card className="flex items-center gap-4 px-5 py-4 ds-card-hover">
            <IconBox variant={colorClasses[color]}>{icon}</IconBox>
            <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-white mt-1">{displayValue}</p>
            </div>
        </Card>
    );
};

export default StatCard;
