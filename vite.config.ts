import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { copyFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

/**
 * C3 fix: copy-data-assets plugin.
 * Cloudflare Pages Functions serve static assets via env.ASSETS.fetch, but
 * the `data/` directory is gitignored, so Vite never copies it to `dist/`
 * by default. Without this plugin, /api/backtest-data in production returns
 * 503 because `/data/years/*.json` doesn't exist in the deployed bundle.
 *
 * This plugin copies:
 *   - data/years/                 (chunked historical market data)
 *   - data/idx80_scan.json        (latest IDX80 scan cache)
 *   - data/fundamental_idx_all.json  (IDX fundamental warehouse JSON)
 *   - data/live_market.json       (post-processed live market snapshot)
 *
 * Runs on `closeBundle()` so the dist/ tree is fully assembled first.
 */
function copyDataAssets(): Plugin {
  const root = process.cwd();
  const distData = resolve(root, 'dist/data');
  const sources = [
    { from: resolve(root, 'data/idx80_scan.json'), to: 'idx80_scan.json' },
    { from: resolve(root, 'data/fundamental_idx_all.json'), to: 'fundamental_idx_all.json' },
    { from: resolve(root, 'data/live_market.json'), to: 'live_market.json' },
  ];
  const yearDirs = [
    { from: resolve(root, 'data/years'), to: 'years' },
  ];

  function copyFile(src: string, dest: string) {
    if (!existsSync(src)) return;
    const destDir = resolve(dest, '..');
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    copyFileSync(src, dest);
    const size = statSync(src).size;
    console.log(`[copy-data-assets] ${src.replace(root + '/', '')} → dist/data/${dest.replace(distData + '/', '')} (${(size / 1024).toFixed(1)} KB)`);
  }

  function copyDir(srcDir: string, destDir: string) {
    if (!existsSync(srcDir)) return;
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcDir)) {
      const s = join(srcDir, entry);
      const d = join(destDir, entry);
      if (statSync(s).isDirectory()) {
        copyDir(s, d);
      } else {
        copyFileSync(s, d);
      }
    }
  }

  return {
    name: 'copy-data-assets',
    apply: 'build',
    closeBundle() {
      if (!existsSync(distData)) mkdirSync(distData, { recursive: true });
      for (const { from, to } of sources) {
        copyFile(from, join(distData, to));
      }
      for (const { from, to } of yearDirs) {
        const destYearDir = join(distData, to);
        copyDir(from, destYearDir);
        const count = existsSync(from) ? readdirSync(from).length : 0;
        console.log(`[copy-data-assets] data/years/ → dist/data/years/ (${count} files)`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      copyDataAssets(),
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
