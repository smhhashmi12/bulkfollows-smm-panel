import React from 'react';
import { useCurrency } from '../lib/CurrencyContext';

interface CurrencyAmountProps {
    amount: number;
    className?: string;
    showCode?: boolean;
}

const CurrencyAmount: React.FC<CurrencyAmountProps> = ({ amount, className = '', showCode = false }) => {
    const { formatAmount, currency } = useCurrency();
    
    return (
        <span className={className}>
            {formatAmount(amount)} {showCode && `${currency}`}
        </span>
    );
};

export default CurrencyAmount;
