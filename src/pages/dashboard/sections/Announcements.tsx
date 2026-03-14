import React from 'react';

type Announcement = {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

type AnnouncementsProps = {
  announcements: Announcement[];
};

const statusClass = (status: string) => {
  if (status === 'open') return 'bg-blue-500/20 text-blue-400';
  if (status === 'in-progress') return 'bg-yellow-500/20 text-yellow-400';
  if (status === 'resolved') return 'bg-green-500/20 text-green-400';
  return 'bg-gray-500/20 text-gray-400';
};

const Announcements: React.FC<AnnouncementsProps> = ({ announcements }) => (
  <>
    <h2 className="text-xl font-bold mb-4">Recent Announcements</h2>
    {announcements.length === 0 ? (
      <p className="text-gray-400 text-sm">No announcements at this time. Check back later for updates!</p>
    ) : (
      <div className="space-y-4">
        {announcements.slice(0, 5).map((announcement) => (
          <div key={announcement.id} className="ds-glass rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-white flex-1">{announcement.subject}</h3>
              <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${statusClass(announcement.status)}`}>
                {announcement.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-2">{announcement.message}</p>
            <p className="text-xs text-gray-500">
              {new Date(announcement.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    )}
  </>
);

export default Announcements;
