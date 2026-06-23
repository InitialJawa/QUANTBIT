import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

// Sync .dark class ↔ data-theme for tweakcn compatibility
const syncTheme = () => {
  const isDark = document.documentElement.classList.contains("dark");
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
};
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
syncTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
