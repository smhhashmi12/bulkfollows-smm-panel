import React from 'react';
import instagramIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Instagram, Color=Original.svg';
import facebookIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Facebook, Color=Original.svg';
import youtubeIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=YouTube, Color=Original.svg';
import twitterIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=X (Twitter), Color=Original.svg';
import spotifyIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Spotify, Color=Original.svg';
import tiktokIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=TikTok, Color=Original.svg';
import linkedInIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=LinkedIn, Color=Original.svg';
import telegramIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Telegram, Color=Original.svg';
import snapchatIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Snapchat, Color=Original.svg';
import discordIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Discord, Color=Original.svg';
import redditIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Reddit, Color=Original.svg';
import threadsIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Threads, Color=Original.svg';
import whatsappIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=WhatsApp, Color=Original.svg';
import twitchIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Twitch, Color=Original.svg';
import pinterestIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Pinterest, Color=Original.svg';
import tumblrIcon from '../../assets/Social Media Icons & Logos (Community) (1)/Platform=Tumblr, Color=Original.svg';

export type SocialPlatformIconKey =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'twitter'
  | 'spotify'
  | 'tiktok'
  | 'linkedin'
  | 'telegram'
  | 'snapchat'
  | 'discord'
  | 'reddit'
  | 'threads'
  | 'whatsapp'
  | 'twitch'
  | 'pinterest'
  | 'tumblr';

const socialIconMap: Record<SocialPlatformIconKey, string> = {
  instagram: instagramIcon,
  facebook: facebookIcon,
  youtube: youtubeIcon,
  twitter: twitterIcon,
  spotify: spotifyIcon,
  tiktok: tiktokIcon,
  linkedin: linkedInIcon,
  telegram: telegramIcon,
  snapchat: snapchatIcon,
  discord: discordIcon,
  reddit: redditIcon,
  threads: threadsIcon,
  whatsapp: whatsappIcon,
  twitch: twitchIcon,
  pinterest: pinterestIcon,
  tumblr: tumblrIcon,
};

const brandedIconPresentation: Partial<
  Record<
    SocialPlatformIconKey,
    {
      wrapperClassName: string;
      imageClassName: string;
    }
  >
> = {
  instagram: {
    wrapperClassName:
      'inline-flex items-center justify-center overflow-hidden rounded-[22%] bg-[linear-gradient(135deg,#f9ce34_0%,#ee2a7b_52%,#6228d7_100%)] p-[16%]',
    imageClassName: 'h-full w-full object-contain brightness-0 invert',
  },
  twitter: {
    wrapperClassName:
      'inline-flex items-center justify-center overflow-hidden rounded-[22%] bg-black p-[18%]',
    imageClassName: 'h-full w-full object-contain brightness-0 invert',
  },
  snapchat: {
    wrapperClassName:
      'inline-flex items-center justify-center overflow-hidden rounded-[22%] bg-[#FFFC00] p-[10%]',
    imageClassName: 'h-full w-full object-contain',
  },
};

const socialPlatformMatchers: Array<{
  key: SocialPlatformIconKey;
  matches: Array<string | RegExp>;
}> = [
  { key: 'instagram', matches: ['instagram', 'insta', /\big\b/i] },
  { key: 'facebook', matches: ['facebook', /\bfb\b/i, 'meta'] },
  { key: 'youtube', matches: ['youtube', /\byt\b/i] },
  { key: 'twitter', matches: ['twitter', 'tweet', 'twitter/x', 'x (twitter)', /^x$/i, /\bx\b/i] },
  { key: 'spotify', matches: ['spotify'] },
  { key: 'tiktok', matches: ['tiktok', 'tik tok', /\btt\b/i] },
  { key: 'linkedin', matches: ['linkedin'] },
  { key: 'telegram', matches: ['telegram'] },
  { key: 'snapchat', matches: ['snapchat'] },
  { key: 'discord', matches: ['discord'] },
  { key: 'reddit', matches: ['reddit'] },
  { key: 'threads', matches: ['threads', 'thread'] },
  { key: 'whatsapp', matches: ['whatsapp', /\bwa\b/i] },
  { key: 'twitch', matches: ['twitch'] },
  { key: 'pinterest', matches: ['pinterest'] },
  { key: 'tumblr', matches: ['tumblr'] },
];

const joinClassNames = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(' ');

export const resolveSocialPlatformIcon = (value: string): SocialPlatformIconKey | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;

  for (const matcher of socialPlatformMatchers) {
    const matched = matcher.matches.some((candidate) => {
      if (candidate instanceof RegExp) {
        return candidate.test(normalized);
      }

      return normalized.includes(candidate);
    });

    if (matched) {
      return matcher.key;
    }
  }

  return null;
};

type SocialPlatformIconProps = {
  platform: SocialPlatformIconKey;
  className?: string;
  alt?: string;
};

export const SocialPlatformIcon: React.FC<SocialPlatformIconProps> = ({
  platform,
  className,
  alt = '',
}) => {
  const presentation = brandedIconPresentation[platform];

  if (!presentation) {
    return (
      <img
        src={socialIconMap[platform]}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        className={joinClassNames('object-contain', className)}
        draggable={false}
        loading="lazy"
      />
    );
  }

  return (
    <span
      className={joinClassNames(presentation.wrapperClassName, className)}
      aria-hidden={alt ? undefined : true}
    >
      <img
        src={socialIconMap[platform]}
        alt={alt}
        className={presentation.imageClassName}
        draggable={false}
        loading="lazy"
      />
    </span>
  );
};

type RenderSocialIconProps = {
  className?: string;
  alt?: string;
};

export const renderSocialPlatformIcon = (
  value: string,
  { className, alt = '' }: RenderSocialIconProps = {},
) => {
  const platform = resolveSocialPlatformIcon(value);
  if (!platform) return null;

  return <SocialPlatformIcon platform={platform} className={className} alt={alt} />;
};
