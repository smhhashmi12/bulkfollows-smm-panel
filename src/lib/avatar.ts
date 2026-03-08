const palette = [
  ['#1d4ed8', '#7c3aed'],
  ['#7c2d12', '#ea580c'],
  ['#0f766e', '#14b8a6'],
  ['#9f1239', '#ec4899'],
  ['#14532d', '#22c55e'],
  ['#312e81', '#8b5cf6'],
];

const getInitials = (seed: string) => {
  const parts = seed
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '');

  if (!parts.length) {
    return 'BF';
  }

  return parts.join('').slice(0, 2);
};

const getPaletteIndex = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash % palette.length;
};

export const getAvatarDataUri = (seed: string) => {
  const safeSeed = seed || 'bulkfollows';
  const initials = getInitials(safeSeed);
  const [from, to] = palette[getPaletteIndex(safeSeed)];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="24" fill="url(#g)" />
      <circle cx="48" cy="48" r="42" fill="rgba(255,255,255,0.08)" />
      <text
        x="50%"
        y="55%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Space Grotesk, Arial, sans-serif"
        font-size="34"
        font-weight="700"
        fill="#ffffff"
      >${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
