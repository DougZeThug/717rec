import { ThemeProvider } from 'next-themes';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { initSentry } from './utils/sentry';

// Initialize Sentry for production error tracking
initSentry();

// CRITICAL: Correct order - Tailwind first, then library, then theme
import './index.css'; // Tailwind base + components + utilities
import 'brackets-viewer/dist/brackets-viewer.min.css'; // Library rules
import './styles/brackets-viewer-717rec-theme.css'; // Theme tweaks last

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
