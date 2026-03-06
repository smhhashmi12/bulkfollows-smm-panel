import React, { useState, useEffect } from 'react';
import { authAPI } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';

const ApiPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchApiKey = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await authAPI.getUserProfile();
      if (profile) {
        // Generate API key from username (in production, this should be stored in DB)
        setApiKey(`sk_${profile.username.split('').reverse().join('')}_${profile.id.slice(0, 8)}`);
      } else {
        setError('Failed to load profile');
      }
    } catch (err: any) {
      const msg = isTimeoutError(err) ? 'Request timed out. Please refresh.' : (err.message || 'Failed to load API key');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold mb-2">Your API Key</h2>
                <p className="text-sm text-gray-400">Use this key to authenticate your API requests.</p>
              </div>
              <button
                onClick={fetchApiKey}
                className="bg-black/20 border border-brand-border hover:bg-black/40 transition-colors text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 1111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 105.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" /></svg>
                Refresh
              </button>
            </div>

            <div className="relative">
              <pre className="bg-black/20 p-4 rounded font-mono break-all text-sm border border-brand-border">{apiKey}</pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 bg-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-3 py-1 rounded text-xs flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 011 1v2h2V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v2h2V3z" /><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8h8V6z" clipRule="evenodd" /></svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">API Documentation</h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <h4 className="font-bold text-white mb-2">Base URL</h4>
                <code className="bg-black/20 px-2 py-1 rounded">{window.location.origin}/api</code>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-2">Authentication</h4>
                <p>Include your API key in the Authorization header:</p>
                <code className="bg-black/20 px-2 py-1 rounded block mt-2">Authorization: Bearer YOUR_API_KEY</code>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Endpoints</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="bg-black/20 px-1">GET /api/services</code> - Get available services</li>
                  <li><code className="bg-black/20 px-1">POST /api/orders</code> - Create a new order</li>
                  <li><code className="bg-black/20 px-1">GET /api/orders</code> - Get your orders</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiPage;
