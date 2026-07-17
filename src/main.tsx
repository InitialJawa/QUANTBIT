import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Router } from 'wouter';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

/**
 * Global chunk-load error handler.
 *
 * When a new deployment is rolled out and the user's browser still has the
 * old index.html cached, dynamic imports (e.g. lazy-loaded tabs) reference
 * chunk filenames that no longer exist on the server. This listener catches
 * the resulting "Failed to fetch dynamically imported module" error and
 * forces a one-time reload so the user gets the new HTML + chunk manifest.
 *
 * Without this, users see a broken page until they manually hard-refresh.
 */
let didReloadOnChunkError = false;
window.addEventListener("vite:preloadError", () => {
  if (didReloadOnChunkError) return;
  didReloadOnChunkError = true;
  window.location.reload();
});
// Fallback for non-Vite chunk errors (older browsers / direct dynamic import).
window.addEventListener("error", (e) => {
  const msg = (e?.message || "").toLowerCase();
  if (msg.includes("failed to fetch dynamically imported module") && !didReloadOnChunkError) {
    didReloadOnChunkError = true;
    window.location.reload();
  }
});

// Capture fatal errors so we can diagnose blank-screen issues.
window.addEventListener("error", (e) => {
  console.error("[QUANTBIT] Global error:", e.message, e.filename, e.lineno, e.colno, e.error);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[QUANTBIT] Unhandled rejection:", e.reason);
});

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (err) {
  console.error("[QUANTBIT] Fatal render error:", err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:32px;color:#ef4444;font-family:system-ui">
      <h2 style="margin-bottom:8px">QUANTBIT — Error Fatal</h2>
      <pre style="white-space:pre-wrap;font-size:13px">${err instanceof Error ? err.stack || err.message : String(err)}</pre>
    </div>`;
  }
}
