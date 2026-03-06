import React from 'react';

export type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, value, onChange, className = '' }) => (
  <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
    {items.map(item => {
      const active = item.id === value;
      return (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${
            active
              ? 'ds-btn-primary text-white'
              : 'ds-pill text-gray-300 hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
        </button>
      );
    })}
  </div>
);
