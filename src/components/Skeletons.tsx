import React from 'react';

/**
 * Generic Skeleton Loader - animated loading placeholder
 */
export const SkeletonLoader: React.FC<{
  width?: string;
  height?: string;
  rounded?: boolean;
  className?: string;
}> = ({ width = 'w-full', height = 'h-6', rounded = false, className = '' }) => (
  <div
    className={`${width} ${height} bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 ${rounded ? 'rounded-lg' : ''} ${className} animate-pulse`}
  />
);

/**
 * Dashboard Skeleton - shows loading state for dashboard page
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonLoader width="w-1/3" height="h-8" rounded />
      <SkeletonLoader width="w-1/2" height="h-4" rounded />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-brand-container border border-brand-border rounded-lg p-6 space-y-3">
          <SkeletonLoader width="w-2/3" height="h-4" rounded />
          <SkeletonLoader width="w-1/2" height="h-6" rounded />
          <SkeletonLoader width="w-1/3" height="h-3" rounded />
        </div>
      ))}
    </div>

    {/* Table Skeleton */}
    <div className="bg-brand-container border border-brand-border rounded-lg p-6 space-y-4">
      <SkeletonLoader width="w-1/4" height="h-5" rounded />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex gap-4 justify-between">
          <SkeletonLoader width="w-1/4" height="h-4" rounded />
          <SkeletonLoader width="w-1/4" height="h-4" rounded />
          <SkeletonLoader width="w-1/4" height="h-4" rounded />
          <SkeletonLoader width="w-1/6" height="h-4" rounded />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Services List Skeleton
 */
export const ServicesSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="bg-brand-container border border-brand-border rounded-lg p-4 space-y-3">
        <SkeletonLoader width="w-3/4" height="h-5" rounded />
        <SkeletonLoader width="w-1/2" height="h-4" rounded />
        <div className="flex gap-2">
          <SkeletonLoader width="w-1/3" height="h-3" rounded />
          <SkeletonLoader width="w-1/3" height="h-3" rounded />
        </div>
        <SkeletonLoader width="w-full" height="h-10" rounded />
      </div>
    ))}
  </div>
);

/**
 * Order Form Skeleton
 */
export const OrderFormSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="space-y-2">
        <SkeletonLoader width="w-1/4" height="h-4" rounded />
        <SkeletonLoader width="w-full" height="h-10" rounded />
      </div>
    ))}
    <SkeletonLoader width="w-full" height="h-12" rounded />
  </div>
);

/**
 * User Profile Skeleton
 */
export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Avatar & Name */}
    <div className="flex gap-4 items-start">
      <SkeletonLoader width="w-32" height="h-32" rounded className="rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonLoader width="w-1/2" height="h-6" rounded />
        <SkeletonLoader width="w-1/3" height="h-4" rounded />
      </div>
    </div>

    {/* Info Fields */}
    <div className="border-t border-brand-border pt-6 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <SkeletonLoader width="w-1/6" height="h-3" rounded />
          <SkeletonLoader width="w-1/2" height="h-4" rounded />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Chat Messages Skeleton
 */
export const ChatSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
        <div className={`${i % 2 === 0 ? 'bg-brand-accent' : 'bg-gray-700'} rounded-lg p-3 max-w-xs`}>
          <SkeletonLoader width="w-48" height="h-4" rounded />
          <SkeletonLoader width="w-32" height="h-3" rounded className="mt-2" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Transaction List Skeleton
 */
export const TransactionsSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="bg-brand-container border border-brand-border rounded-lg p-4 flex justify-between items-center">
        <div className="flex-1 space-y-2">
          <SkeletonLoader width="w-1/3" height="h-4" rounded />
          <SkeletonLoader width="w-1/4" height="h-3" rounded />
        </div>
        <SkeletonLoader width="w-1/6" height="h-5" rounded />
      </div>
    ))}
  </div>
);

/**
 * Table Skeleton with custom row count
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLoader key={`header-${i}`} width="w-1/4" height="h-4" rounded />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={`row-${rowIdx}`} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <SkeletonLoader
            key={`col-${colIdx}`}
            width="w-1/4"
            height="h-4"
            rounded
          />
        ))}
      </div>
    ))}
  </div>
);
