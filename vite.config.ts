import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Exclude test files from processing
      exclude: /\.test\.(ts|tsx)$/,
    }),
  ],
  // Optimize dependencies - include lucide-react to prevent dynamic loading issues
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@tanstack/react-query',
      'formik',
      'yup',
    ],
    exclude: [],
    // Force pre-bundling
    force: false,
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false,
    open: false,
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    // Improved HMR configuration
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    // Watch options for better performance
    watch: {
      usePolling: false,
      interval: 100,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket for HMR
      },
    },
  },
  build: {
    // Disable sourcemaps in production for faster builds
    sourcemap: process.env.NODE_ENV === 'development',
    // Minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // CSS code splitting
    cssCodeSplit: true,
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunking strategy for optimal loading
        manualChunks: (id) => {
          // Node modules vendor chunks
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Form libraries
            if (id.includes('formik') || id.includes('yup')) {
              return 'form-vendor';
            }
            // Icons - bundle lucide-react to prevent dynamic loading issues
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Charts
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // Calendar
            if (id.includes('@fullcalendar')) {
              return 'calendar-vendor';
            }
            // Other vendor code
            return 'vendor';
          }
          // Route-based code splitting
          if (id.includes('/src/pages/')) {
            const match = id.match(/\/src\/pages\/([^/]+)/);
            if (match) {
              return `page-${match[1]}`;
            }
          }
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/${ext}/[name]-[hash][extname]`;
        },
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Report compressed size
    reportCompressedSize: true,
    // Reduce console output
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
  },
  // ESBuild options
  esbuild: {
    target: 'esnext',
    // Drop console in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  // CSS options
  css: {
    devSourcemap: true,
    // PostCSS will be handled by tailwind
  },
  // Performance optimizations
  resolve: {
    // Alias for faster resolution
    alias: {
      '@': '/src',
    },
    // Dedupe to prevent duplicate dependencies
    dedupe: ['react', 'react-dom'],
  },
  // Preview server config
  preview: {
    port: 4173,
    host: 'localhost',
    strictPort: false,
  },
});
