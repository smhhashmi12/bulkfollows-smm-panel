import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface CurrencyContextType {
    currency: string;
    setCurrency: (currency: string) => void;
    formatAmount: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

// Simple exchange rates (base: USD)
const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    PKR: 278.5,
    INR: 83.2,
    AED: 3.67,
    CAD: 1.36,
    AUD: 1.53,
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrency] = useState<string>(() => {
        return localStorage.getItem('selectedCurrency') || 'USD';
    });

    const handleCurrencyChange = (newCurrency: string) => {
        setCurrency(newCurrency);
        localStorage.setItem('selectedCurrency', newCurrency);
    };

    const formatAmount = (amount: number): string => {
        const currencyObj = currencies.find(c => c.code === currency);
        if (!currencyObj) return `$${amount.toFixed(2)}`;

        // Convert from USD to selected currency
        const converted = amount * (exchangeRates[currency] || 1);
        
        // Format based on currency
        if (currency === 'PKR' || currency === 'INR') {
            return `${currencyObj.symbol}${converted.toFixed(0)}`;
        }
        
        return `${currencyObj.symbol}${converted.toFixed(2)}`;
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency: handleCurrencyChange, formatAmount }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
