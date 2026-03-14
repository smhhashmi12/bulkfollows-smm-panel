import React from 'react';

const StatsGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`stats-skeleton-${index}`}
        className="h-28 bg-brand-container border border-brand-border rounded-2xl animate-pulse"
      />
    ))}
  </div>
);

export default StatsGridSkeleton;
