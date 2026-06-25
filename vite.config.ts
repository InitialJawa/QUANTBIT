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
 * IMPORTANT: only the files ACTUALLY read at runtime must be copied. The
 * `data/` directory contains both runtime data AND pipeline source data
 * (e.g. `fundamental_idx_all.json` is the source-of-truth for the Python
 * collector — it's 40 MB and not used at runtime). Copying the wrong file
 * pushes the build over the 25 MiB CF Pages per-file limit.
 *
 * Files needed at runtime (verified by grep on functions/api/[[path]].ts):
 *   - data/years/*.json           — chunked historical market data
 *   - data/idx80_scan.json        — latest IDX80 scan cache (191 KB)
 *   - data/idx_fundamentals_all.json  — IDX fundamental warehouse for /api/fundamentals (4.2 MB)
 *
 * Files NOT copied (deliberately):
 *   - data/fundamental_idx_all.json (40 MB) — pipeline source, not runtime
 *   - data/live_market.json       — only used by post_process_live_market.py
 *   - data/historical_market_data.json (73 MB) — source for split-data, not runtime
 *   - data/*.parquet              — same, pipeline-only
 *
 * Runs on `closeBundle()` so the dist/ tree is fully assembled first.
 */
function copyDataAssets(): Plugin {
  const root = process.cwd();
  const distData = resolve(root, 'dist/data');
  const sources = [
    { from: resolve(root, 'data/idx80_scan.json'), to: 'idx80_scan.json' },
    { from: resolve(root, 'data/idx_fundamentals_all.json'), to: 'idx_fundamentals_all.json' },
  ];
  const yearDirs = [
    { from: resolve(root, 'data/years'), to: 'years' },
  ];

  function copyFile(src: string, dest: string) {
    if (!existsSync(src)) {
      console.warn(`[copy-data-assets] SKIP (not found): ${src.replace(root + '/', '')}`);
      return;
    }
    const stat = statSync(src);
    if (stat.size > 25 * 1024 * 1024) {
      // CF Pages per-file limit is 25 MiB. Refuse to copy oversized files
      // because they'll fail validation at deploy time.
      console.error(`[copy-data-assets] REFUSE (over 25 MiB limit): ${src.replace(root + '/', '')} (${(stat.size / 1024 / 1024).toFixed(1)} MiB)`);
      return;
    }
    const destDir = resolve(dest, '..');
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    copyFileSync(src, dest);
    console.log(`[copy-data-assets] ${src.replace(root + '/', '')} → dist/data/${dest.replace(distData + '/', '')} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  function copyDir(srcDir: string, destDir: string) {
    if (!existsSync(srcDir)) {
      console.warn(`[copy-data-assets] SKIP (not found): ${srcDir.replace(root + '/', '')}`);
      return;
    }
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(srcDir)) {
      const s = join(srcDir, entry);
      const d = join(destDir, entry);
      if (statSync(s).isDirectory()) {
        copyDir(s, d);
      } else {
        const stat = statSync(s);
        if (stat.size > 25 * 1024 * 1024) {
          console.error(`[copy-data-assets] REFUSE (over 25 MiB limit): ${s.replace(root + '/', '')} (${(stat.size / 1024 / 1024).toFixed(1)} MiB)`);
          continue;
        }
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
        // Local dev AI chat — Express server reads OPENROUTER_API_KEY /
        // GROQ_API_KEY / GEMINI_API_KEY from .env.local. Requires
        // `npm run serve-api` running in another terminal.
        '/api/ai/chat': 'http://localhost:3001',
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
