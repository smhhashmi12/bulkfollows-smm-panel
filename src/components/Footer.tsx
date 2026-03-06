import React from 'react';

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#grad1)" />
      <path d="M12 2L12 12L22 7L12 2Z" fill="url(#grad2)" />
      <path d="M2 7L12 12L12 22L2 17V7Z" fill="url(#grad3)" />
      <path d="M12 12L22 17L22 7L12 12Z" fill="url(#grad4)" />
      <defs>
        <linearGradient id="grad1" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="1" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id="grad2" x1="17" y1="2" x2="17" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F472B6" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="grad3" x1="7" y1="7" x2="7" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="grad4" x1="17" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
    <span className="text-xl font-bold">BulkFollows</span>
  </div>
);

const PayAppMark: React.FC = () => (
  <svg viewBox="0 0 120 32" className="h-5 w-auto" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="10" fill="#111827" stroke="#374151" />
    <path d="M12 22V10h6.3c3.2 0 5.2 1.9 5.2 4.8 0 3-2.1 4.9-5.2 4.9h-3.2V22H12zm3.1-5h2.7c1.7 0 2.7-.8 2.7-2.3 0-1.4-1-2.2-2.7-2.2h-2.7V17z" fill="#FFFFFF" />
    <text x="40" y="21" fill="#E5E7EB" fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif">
      PayApp
    </text>
  </svg>
);

const MastercardMark: React.FC = () => (
  <svg viewBox="0 0 120 32" className="h-5 w-auto" aria-hidden="true">
    <circle cx="16" cy="16" r="10" fill="#EB001B" />
    <circle cx="28" cy="16" r="10" fill="#F79E1B" fillOpacity="0.92" />
    <path d="M22 8.7a10 10 0 010 14.6 10 10 0 010-14.6z" fill="#FF5F00" />
    <text x="44" y="21" fill="#E5E7EB" fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif">
      Mastercard
    </text>
  </svg>
);

const VisaMark: React.FC = () => (
  <svg viewBox="0 0 88 32" className="h-5 w-auto" aria-hidden="true">
    <rect x="1" y="1" width="86" height="30" rx="10" fill="#0F172A" stroke="#1D4ED8" />
    <text x="16" y="21" fill="#2563EB" fontSize="16" fontStyle="italic" fontWeight="700" fontFamily="Arial, sans-serif">
      VISA
    </text>
  </svg>
);

const trustBadges = [
  {
    name: 'PayApp',
    bgClassName: 'bg-slate-800/70',
    Badge: PayAppMark,
  },
  {
    name: 'Mastercard',
    bgClassName: 'bg-zinc-900/80',
    Badge: MastercardMark,
  },
  {
    name: 'Visa',
    bgClassName: 'bg-slate-900/80',
    Badge: VisaMark,
  },
];

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/20">
      <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 text-gray-400 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 text-sm">Emam Media LTD</p>
            <p className="text-sm">Address: 20-22 Wenlock Road, London, England, N1 7GU</p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">Quick Links</h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <a href="/#/register" className="hover:text-white">
                Sign up
              </a>
              <a href="#" className="hover:text-white">
                Terms
              </a>
              <a href="#" className="hover:text-white">
                How It Works
              </a>
              <a href="#" className="hover:text-white">
                Blogs
              </a>
            </div>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-white">We're trusted</h4>
            <div className="flex flex-wrap items-center gap-4">
              {trustBadges.map(({ name, bgClassName, Badge }) => (
                <div key={name} className={`rounded-md border border-white/10 p-2 ${bgClassName}`}>
                  <Badge />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-brand-border pt-6 text-center text-sm text-gray-500">
          <p>Copyright - 2025 All right Reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
