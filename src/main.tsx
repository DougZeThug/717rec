import { ThemeProvider } from 'next-themes';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { initSentry } from './utils/sentry';

// Initialize Sentry for production error tracking
initSentry();

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
