import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy API requests to local backend during development
        proxy: {
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true,
            secure: false,
          },
          '/webhook': {
            target: 'http://localhost:4000',
            changeOrigin: true,
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
      },
      build: {
        target: 'ES2020',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            passes: 2,
          },
          mangle: true,
          format: {
            comments: false,
          }
        },
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              supabase: ['@supabase/supabase-js'],
              'feature-analytics': ['@vercel/analytics/react'],
            },
          }
        },
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 1000,
        reportCompressedSize: true,
      }
    };
});
