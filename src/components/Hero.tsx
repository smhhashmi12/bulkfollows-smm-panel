import React, { useState } from 'react';
import { User } from '../App';

interface HeroProps {
    onLoginSuccess: (user: User) => void;
}


const Hero: React.FC<HeroProps> = ({ onLoginSuccess }) => {
  const comparisonFeatures = [
    { name: "Free Childpanel", bulkfollows: true, others: true },
    { name: "Point for each $spend", bulkfollows: true, others: true },
    { name: "Upto 10% Discount", bulkfollows: true, others: true },
    { name: "Upto 15% Deposit Bonus", bulkfollows: true, others: true },
    { name: "24/7 Support through ticket, Whatsapp, Telegram", bulkfollows: true, others: true },
  ];
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login for a standard user.
    // In a real app, you'd use the actual username.
    onLoginSuccess({ username: username || 'John Doe', role: 'user' });
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-3 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none" />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>
                <div className="relative w-full">
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  <span>Sign In</span>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                <button type="button" className="w-full bg-white/10 hover:bg-white/20 transition-colors text-white font-semibold p-3 rounded-lg flex items-center justify-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="h-5 w-5" />
                  <span>Login with G</span>
                </button>
              </div>
            </form>
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
