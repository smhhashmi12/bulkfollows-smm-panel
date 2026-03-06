import React, { useState } from 'react';
import { User } from '../App'; // Import the User type

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#grad1)"/>
      <path d="M12 2L12 12L22 7L12 2Z" fill="url(#grad2)"/>
      <path d="M2 7L12 12L12 22L2 17V7Z" fill="url(#grad3)"/>
      <path d="M12 12L22 17L22 7L12 12Z" fill="url(#grad4)"/>
      <defs>
        <linearGradient id="grad1" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7"/>
          <stop offset="1" stopColor="#6D28D9"/>
        </linearGradient>
        <linearGradient id="grad2" x1="17" y1="2" x2="17" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F472B6"/>
          <stop offset="1" stopColor="#EC4899"/>
        </linearGradient>
        <linearGradient id="grad3" x1="7" y1="7" x2="7" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA"/>
          <stop offset="1" stopColor="#3B82F6"/>
        </linearGradient>
        <linearGradient id="grad4" x1="17" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA"/>
          <stop offset="1" stopColor="#8B5CF6"/>
        </linearGradient>
      </defs>
    </svg>
    <a href="/#"><span className="text-xl font-bold">BulkFollows</span></a>
  </div>
);

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex justify-between items-center gap-3">
        <Logo />
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L7.54 5.65 5.05 6.63c-1.5.56-2.07 2.37-1.02 3.42L5.58 12 4.6 14.47c-.56 1.5.99 2.92 2.49 2.4l2.48-1.01 2.48 1.01c1.5.52 3.05-.9 2.49-2.4l-.98-2.47 1.55-1.95c1.05-1.05.48-2.86-1.02-3.42l-2.49-.98L11.49 3.17zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
             <span>How It Works</span>
          </a>
          <a href="#" className="text-gray-300 hover:text-white transition-colors">Terms</a>
          <a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a>
          <a href="/#/admin" className="text-gray-300 hover:text-white transition-colors">Admin Panel</a>
           {currentUser ? (
              <a href="/#/dashboard" className="bg-white/10 px-4 py-2 rounded-md text-sm font-medium hover:bg-white/20 transition-colors">Go to Dashboard</a>
          ) : (
              <a href="/#/login" className="bg-white/10 px-4 py-2 rounded-md text-sm font-medium hover:bg-white/20 transition-colors">Sign in</a>
          )}
        </nav>
        <div className="flex items-center gap-3">
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-gray-300 hover:text-white transition"
                aria-label="Toggle menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" />
                </svg>
            </button>
        {currentUser ? (
             <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 cursor-pointer">
                    <img src={`https://i.pravatar.cc/150?u=${currentUser.username}`} alt="User Avatar" className="w-10 h-10 rounded-full border-2 border-brand-purple" />
                </button>
                {dropdownOpen && (
                     <div className="absolute right-0 mt-2 w-48 bg-brand-container border border-brand-border rounded-lg shadow-lg py-1 z-20">
                        <div className="px-4 py-2 text-sm text-gray-400 border-b border-brand-border">Signed in as <br/><strong className="text-white">{currentUser.username}</strong></div>
                        <a href="/#/dashboard" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Dashboard</a>
                        <button 
                            onClick={onLogout}
                            className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-white/10"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <a href="/#/register" className="hidden sm:inline-flex bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-5 py-2.5 rounded-lg shadow-purple-glow-sm">
              Register
            </a>
        )}
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden mt-4 bg-brand-container border border-brand-border rounded-2xl p-4 space-y-3">
          <a onClick={() => setMobileOpen(false)} href="#" className="block text-gray-300 hover:text-white transition">How It Works</a>
          <a onClick={() => setMobileOpen(false)} href="#" className="block text-gray-300 hover:text-white transition">Terms</a>
          <a onClick={() => setMobileOpen(false)} href="#" className="block text-gray-300 hover:text-white transition">Blog</a>
          <a onClick={() => setMobileOpen(false)} href="/#/admin" className="block text-gray-300 hover:text-white transition">Admin Panel</a>
          <div className="pt-2 border-t border-brand-border flex flex-col gap-2">
            {currentUser ? (
              <>
                <a onClick={() => setMobileOpen(false)} href="/#/dashboard" className="bg-white/10 px-4 py-2 rounded-md text-sm font-medium hover:bg-white/20 transition-colors text-center">Go to Dashboard</a>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a onClick={() => setMobileOpen(false)} href="/#/login" className="bg-white/10 px-4 py-2 rounded-md text-sm font-medium hover:bg-white/20 transition-colors text-center">Sign in</a>
                <a onClick={() => setMobileOpen(false)} href="/#/register" className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-5 py-2.5 rounded-lg shadow-purple-glow-sm text-center">
                  Register
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
