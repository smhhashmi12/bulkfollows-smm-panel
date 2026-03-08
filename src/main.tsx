import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/space-grotesk/latin-300.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import App from './App';
import './tailwind.css';
import './index.css';

// Performance: Mark the start of React initialization
if ('performance' in window && 'mark' in performance) {
  performance.mark('react-init-start');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance: Mark the end of React initialization
if ('performance' in window && 'mark' in performance) {
  performance.mark('react-init-end');
  try {
    performance.measure('react-initialization', 'react-init-start', 'react-init-end');
  } catch (e) {
    // Silently fail if marks don't exist
  }
}

// Defer non-critical third-party scripts using requestIdleCallback
if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    // Load analytics or other non-critical third-party scripts here
    // This prevents them from blocking initial page render
    // Example:
    // import('./lib/analytics').catch(e => console.warn('Analytics load failed:', e));
  });
}
