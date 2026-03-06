import React, { useState } from 'react';
import { User } from '../../App';
import { authAPI } from '../../lib/api';

const Logo: React.FC = () => (
    <div className="flex items-center space-x-2 justify-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#grad1)"/><path d="M12 2L12 12L22 7L12 2Z" fill="url(#grad2)"/><path d="M2 7L12 12L12 22L2 17V7Z" fill="url(#grad3)"/><path d="M12 12L22 17L22 7L12 12Z" fill="url(#grad4)"/>
        <defs>
          <linearGradient id="grad1" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A855F7"/><stop offset="1" stopColor="#6D28D9"/></linearGradient>
          <linearGradient id="grad2" x1="17" y1="2" x2="17" y2="12" gradientUnits="userSpaceOnUse"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#EC4899"/></linearGradient>
          <linearGradient id="grad3" x1="7" y1="7" x2="7" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#3B82F6"/></linearGradient>
          <linearGradient id="grad4" x1="17" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse"><stop stopColor="#A78BFA"/><stop offset="1" stopColor="#8B5CF6"/></linearGradient>
        </defs>
      </svg>
      <span className="text-2xl font-bold">BulkFollows</span>
    </div>
  );

interface AdminLoginPageProps {
    onLoginSuccess: (user: User) => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authAPI.signIn(email, password);
            
            // Get the user profile with proper error handling
            const user = await authAPI.getCurrentUser();

            if (user && user.role === 'admin') {
                onLoginSuccess(user);
            } else {
                // User logged in but is not an admin
                setError(user ? `Access denied. Your role is '${user.role}', not 'admin'.` : 'Failed to get user profile.');
                // Sign them out since they shouldn't be here
                await authAPI.signOut();
            }
        } catch (err: any) {
            setError(err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-brand-dark ds-noise text-white font-sans min-h-screen flex items-center justify-center p-4">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1a0a36] to-brand-dark z-0"></div>
            <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,81,255,0.2),rgba(255,255,255,0))]"></div>
            
            <div className="w-full max-w-md bg-brand-container border border-brand-border rounded-2xl p-8 backdrop-blur-sm shadow-purple-glow z-10">
                <div className="text-center mb-8">
                    <Logo />
                    <h1 className="text-2xl font-bold mt-4">Admin Panel Login</h1>
                     <p className="text-sm text-gray-400">Use admin@example.com to log in.</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    {error && <p className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none" 
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none" 
                        />
                    </div>
                     <div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold p-3 rounded-lg shadow-purple-glow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging In...' : 'Login'}
                        </button>
                    </div>
                     <p className="text-center text-sm text-gray-400">Looking for the main site? <a href="/#" className="font-semibold text-brand-light-purple hover:text-white">Go back</a></p>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginPage;
