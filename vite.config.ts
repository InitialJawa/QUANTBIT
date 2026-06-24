import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api/backtest-data': 'http://localhost:3001',
        '/api/yahoo': 'http://localhost:3001',
      },
    },
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        // Exclude very large data files from the client bundle.
        // These are loaded at runtime via API endpoints, not bundled.
        external: [
          /src\/data\/fundamental_idx_all\.json$/,
          /src\/data\/historical_market_data\.json$/,
          /data\/fundamental_idx_all\.json$/,
          /data\/historical_market_data\.json$/,
        ],
        output: {
          // Split heavy third-party libs into separate cacheable chunks.
          // React is intentionally left in the main bundle to avoid load-order issues.
          manualChunks: {
            'charts-vendor': ['recharts'],
            'motion-vendor': ['motion'],
            'icons-vendor': ['lucide-react'],
          },
        },
      },
    },
  };
});
