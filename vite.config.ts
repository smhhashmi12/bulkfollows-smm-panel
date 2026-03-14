import path from 'path';
import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async ({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const analyze = env.ANALYZE === 'true';
    let visualizerPlugin = null;
    if (analyze) {
      try {
        const mod = await import('rollup-plugin-visualizer');
        visualizerPlugin = mod.visualizer({
          filename: 'dist/bundle-report.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: true,
        });
      } catch (error) {
        console.warn('[Vite] rollup-plugin-visualizer not installed; skipping bundle report.', error);
      }
    }
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
      plugins: [
        react(),
        splitVendorChunkPlugin(),
        visualizerPlugin,
      ].filter(Boolean),
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
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('@supabase')) return 'supabase';
                if (id.includes('@tanstack')) return 'react-query';
                if (id.includes('@vercel/analytics')) return 'feature-analytics';
                if (id.includes('react')) return 'react-vendor';
                return 'vendor';
              }
              return undefined;
            },
          },
        },
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 1000,
        reportCompressedSize: true,
      }
    };
});
