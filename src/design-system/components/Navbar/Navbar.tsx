import React from 'react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  onToggleSidebar,
}) => {
  return (
    <div className="ds-topbar px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-gray-400 hover:text-white transition"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          {title && <h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1>}
          {subtitle && <p className="text-xs sm:text-sm text-gray-400 truncate">{subtitle}</p>}
        </div>
        {leftSlot}
      </div>
      {rightSlot && <div className="flex flex-wrap items-center gap-3 justify-between">{rightSlot}</div>}
    </div>
  );
};
