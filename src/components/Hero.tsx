import React, { useState } from 'react';
import { authAPI } from '../lib/api';

const Hero: React.FC = () => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const comparisonFeatures = [
    { name: "Free Childpanel", bulkfollows: true, others: true },
    { name: "Point for each $spend", bulkfollows: true, others: true },
    { name: "Upto 10% Discount", bulkfollows: true, others: true },
    { name: "Upto 15% Deposit Bonus", bulkfollows: true, others: true },
    { name: "24/7 Support through ticket, Whatsapp, Telegram", bulkfollows: true, others: true },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.hash = '#/login';
  };

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setGoogleLoading(true);

    try {
      await authAPI.signInWithGoogle('#/dashboard');
    } catch (error: any) {
      setGoogleError(error.message || 'Google sign in failed.');
      setGoogleLoading(false);
    }
  };


  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <span className="self-start bg-purple-500/20 text-brand-light-purple px-4 py-1 rounded-full text-sm font-medium border border-purple-500/30">Smm Panel</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">Welcome to Bulkfollows <br /> Smm Panel!</h1>
          <p className="text-gray-300 max-w-lg">
            In today's fast-changing digital world, businesses are using social media to connect with their target audience more effectively than ever. This has made Social Media Marketing (SMM) a powerful tool for marketers. One platform that stands out for providing SMM services is Bulkfollows.
          </p>
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6 flex flex-col gap-4 mt-4">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder="Username" 
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-3 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none" />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <div className="relative w-full">
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-3 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none" />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="form-checkbox bg-black/20 border-brand-border rounded text-brand-purple focus:ring-brand-purple" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="hover:text-white">Forgot password?</a>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <button type="submit" className="w-full bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold p-3 rounded-lg flex items-center justify-center gap-2">
                  <span>Go to Login</span>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold p-3 rounded-lg flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3l3 2.3c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z" />
                    <path fill="#34A853" d="M12 21c2.6 0 4.8-.9 6.4-2.5l-3-2.3c-.8.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1l-3.1 2.4C5 18.8 8.2 21 12 21z" />
                    <path fill="#4A90E2" d="M6.4 13c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2L3.3 6.6C2.5 8 2 9.4 2 11s.5 3 1.3 4.4L6.4 13z" />
                    <path fill="#FBBC05" d="M12 4.9c1.4 0 2.7.5 3.8 1.5l2.8-2.8C16.8 1.9 14.6 1 12 1 8.2 1 5 3.2 3.3 6.6L6.4 9c.8-2.3 3-4.1 5.6-4.1z" />
                  </svg>
                  <span>{googleLoading ? 'Redirecting...' : 'Google Login'}</span>
                </button>
              </div>
            </form>
            {googleError ? (
              <p className="text-center text-sm text-red-400 mt-4">{googleError}</p>
            ) : null}
            <p className="text-center text-sm text-gray-400 mt-4">Do not have an account? <a href="/#/register" className="font-semibold text-brand-light-purple hover:text-white">Sign up</a></p>
          </div>
        </div>

        <div className="bg-brand-container border border-brand-border rounded-3xl p-8 backdrop-blur-sm shadow-purple-glow">
          <h3 className="text-2xl font-bold mb-6 text-center">Bulkfollows VS Others</h3>
          <div className="flex justify-around bg-black/20 rounded-lg p-1 mb-6">
            <button className="w-1/2 py-2.5 rounded-md bg-gradient-to-r from-brand-accent to-brand-purple text-white font-semibold text-sm">Bulkfollows</button>
            <button className="w-1/2 py-2.5 rounded-md text-gray-300 font-semibold text-sm">Others Site</button>
          </div>
          <div className="flex flex-col gap-4">
            {comparisonFeatures.map((feature, index) => (
              <div key={index} className="flex justify-between items-center text-sm text-gray-300">
                <span>{feature.name}</span>
                <div className="flex items-center gap-6 sm:gap-16">
                  <span className="text-green-400">{feature.bulkfollows ? '✓' : '✗'}</span>
                  <span className="text-green-400">{feature.others ? '✓' : '✗'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
