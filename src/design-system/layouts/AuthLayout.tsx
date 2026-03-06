import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => (
  <div className="ds-shell flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-2xl ds-card ds-card-hover p-6 sm:p-8">{children}</div>
  </div>
);
