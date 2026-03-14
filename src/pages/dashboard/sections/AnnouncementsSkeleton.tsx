import React from 'react';

const AnnouncementsSkeleton: React.FC = () => (
  <div>
    <div className="h-6 w-48 bg-white/10 rounded-full animate-pulse mb-4" />
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`announcement-skeleton-${index}`}
          className="h-20 bg-black/20 rounded-lg animate-pulse"
        />
      ))}
    </div>
  </div>
);

export default AnnouncementsSkeleton;
