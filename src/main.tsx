import { ThemeProvider } from 'next-themes';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { initSentry } from './utils/sentry';

// Defer Sentry initialization to avoid forced reflow during critical rendering
// Error tracking is non-critical for initial page render
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initSentry(), { timeout: 3000 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(initSentry, 2000);
}

// Core styles only - bracket CSS is lazy-loaded on Playoffs page
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="winter-frozen"
    themes={['light', 'dark', 'system', 'winter-frozen']}
    enableSystem={true}
    disableTransitionOnChange={false}
  >
    <App />
  </ThemeProvider>
);
