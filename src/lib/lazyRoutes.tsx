/**
 * Route lazy loading configuration
 * Reduces initial bundle size and enables code splitting.
 */

import React, { Suspense, lazy } from 'react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Lazy load all pages - only loaded when route is accessed
export const LandingPageLazy = lazy(() => import('../pages/LandingPage'));
export const UserDashboardLazy = lazy(() => import('../pages/UserDashboard'));
export const AdminDashboardLazy = lazy(() => import('../pages/AdminDashboard'));
export const AdminLoginPageLazy = lazy(() => import('../pages/admin/AdminLogin'));
export const UserLoginPageLazy = lazy(() => import('../pages/UserLogin'));
export const RegistrationPageLazy = lazy(() => import('../pages/RegistrationPage'));

/**
 * Wraps a lazy component with Suspense for proper loading states
 * @param LazyComponent - The lazy-loaded component
 * @returns Wrapped component with loading fallback
 */
export function withSuspense<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>
): React.FC<P> {
  return (props: P) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Export wrapped components
export const LandingPage = withSuspense(LandingPageLazy);
export const UserDashboard = withSuspense(UserDashboardLazy);
export const AdminDashboard = withSuspense(AdminDashboardLazy);
export const AdminLoginPage = withSuspense(AdminLoginPageLazy);
export const UserLoginPage = withSuspense(UserLoginPageLazy);
export const RegistrationPage = withSuspense(RegistrationPageLazy);
