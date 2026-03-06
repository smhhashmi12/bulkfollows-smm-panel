import React from 'react';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ sidebar, navbar, children }) => {
  return (
    <div className="ds-shell">
      <div className="ds-app ds-noise min-h-[calc(100vh-24px)] flex">
        {sidebar}
        <div className="flex-1 min-w-0 flex flex-col ds-page">
          {navbar}
          <main className="mt-4 flex-1 min-w-0 overflow-y-auto ds-scrollbar">{children}</main>
        </div>
      </div>
    </div>
  );
};
