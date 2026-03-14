import React from 'react';

const PopularServicesSkeleton: React.FC = () => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 w-40 bg-white/10 rounded-full animate-pulse" />
      <div className="h-5 w-20 bg-white/10 rounded-full animate-pulse" />
    </div>
    <div className="h-10 w-full bg-white/5 rounded-full animate-pulse mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`services-skeleton-${index}`}
          className="h-52 bg-brand-container border border-brand-border rounded-2xl animate-pulse"
        />
      ))}
    </div>
  </div>
);

export default PopularServicesSkeleton;
