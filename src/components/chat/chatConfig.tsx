import React from 'react';
import { SocialPlatformIcon } from '../social/SocialIcon';

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
  icon: React.ReactNode;
};

export const chatPlatforms: ChatPlatformMeta[] = [
  {
    id: 'live',
    label: 'Live',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 3v-3H4a2 2 0 0 1-2-2V5z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <SocialPlatformIcon platform="whatsapp" className="h-5 w-5" />,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: <SocialPlatformIcon platform="telegram" className="h-5 w-5" />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: <SocialPlatformIcon platform="instagram" className="h-5 w-5" />,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: <SocialPlatformIcon platform="facebook" className="h-5 w-5" />,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: <SocialPlatformIcon platform="tiktok" className="h-5 w-5" />,
  },
];

export const getChatPlatform = (id?: string) =>
  chatPlatforms.find((platform) => platform.id === id) || chatPlatforms[0];
