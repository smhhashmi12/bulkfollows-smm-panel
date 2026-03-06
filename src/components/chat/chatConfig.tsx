import React from 'react';

export type ChatPlatformId =
  | 'live'
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'facebook'
  | 'tiktok';

export type ChatPlatformMeta = {
  id: ChatPlatformId;
  label: string;
  accent: string;
  icon: React.ReactNode;
};

export const chatPlatforms: ChatPlatformMeta[] = [
  {
    id: 'live',
    label: 'Live',
    accent: 'bg-brand-accent/20 text-purple-200 border border-brand-border',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v11H9l-5 4V5z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    accent: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4a8 8 0 0 0-6.93 12l-.9 3.2 3.3-.86A8 8 0 1 0 12 4z" />
        <path d="M9.3 9.2c.3-.4.6-.4.9-.2l.9.6c.3.2.3.5.1.8l-.4.6c-.2.3-.1.6.1.8a6.2 6.2 0 0 0 2.8 2.2c.3.1.6 0 .7-.2l.4-.6c.2-.3.5-.4.8-.2l1 .4c.3.1.4.4.3.7-.2.8-.9 1.2-1.7 1.2-3.3 0-7.1-3-7.1-6.7 0-.8.4-1.5 1.1-1.9z" />
      </svg>
    ),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    accent: 'bg-sky-500/15 text-sky-200 border border-sky-500/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 4L3 11l6 2 2 6 10-15z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    accent: 'bg-pink-500/15 text-pink-200 border border-pink-500/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    accent: 'bg-blue-500/15 text-blue-200 border border-blue-500/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M15 3h-3a4 4 0 0 0-4 4v3H6v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    accent: 'bg-slate-500/15 text-slate-200 border border-slate-500/30',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 4c1.2 2.4 3.1 3.7 6 4v3c-2.4-.1-4.5-.9-6-2.4V15a5 5 0 1 1-5-5" />
      </svg>
    ),
  },
];

export const getChatPlatform = (id?: string) =>
  chatPlatforms.find((platform) => platform.id === id) || chatPlatforms[0];
