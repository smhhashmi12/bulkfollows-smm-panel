import React from 'react';

export type SidebarItem = {
  id: string;
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
};

interface SidebarProps {
  brand?: React.ReactNode;
  items: SidebarItem[];
  activeId?: string;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  brand,
  items,
  activeId,
  footer,
  headerExtra,
  isOpen = false,
  onClose,
  onItemClick,
}) => {
  return (
    <>
      <aside className="ds-sidebar hidden md:flex flex-col w-64 p-4">
        <div className="flex items-center justify-between mb-6">
          <div>{brand}</div>
          {headerExtra}
        </div>
        <nav className="flex-1 flex flex-col gap-2">
          {items.map(item => (
            <a
              key={item.id}
              href={item.href}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeId === item.id
                  ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>
        {footer && <div className="mt-6">{footer}</div>}
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${isOpen ? 'block' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[80%] ds-sidebar p-4 transition-transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>{brand}</div>
            {headerExtra}
            <button onClick={onClose} className="text-gray-400 hover:text-white transition" aria-label="Close menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 flex flex-col gap-2">
            {items.map(item => (
              <a
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  activeId === item.id
                    ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
          {footer && <div className="mt-6">{footer}</div>}
        </aside>
      </div>
    </>
  );
};
