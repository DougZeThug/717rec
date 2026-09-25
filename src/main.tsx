import { ThemeProvider } from 'next-themes';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { isSupabaseConfigured } from './integrations/supabase/client';
import { initOnlineStatus } from './utils/onlineStatus';
import { initSentry } from './utils/sentry';

// Before anything reads it: the query client's online state starts as `true`
// regardless of the browser, so an app opened with no signal would not know.
initOnlineStatus();

// Install the error hooks at the first idle moment, and within eight seconds
// whatever happens, so they never compete with the first paint. Note that
// requestIdleCallback's `timeout` is a deadline, not a delay: this runs early
// on a normal load, which is deliberate here. initSentry is the cheap half — it
// registers the hooks with `integrations: []` — and a crash in the first
// seconds is exactly the one worth reporting, so it must not be slept through.
// The expensive half, the session replay recorder, is deferred separately
// inside initSentry.
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initSentry(), { timeout: 8000 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(initSentry, 8000);
}

// Core styles only - bracket CSS is lazy-loaded on Playoffs page
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);

if (!isSupabaseConfigured) {
  root.render(
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        background: '#0b1220',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 560, lineHeight: 1.5 }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>App configuration missing</h1>
        <p style={{ marginBottom: '0.75rem' }}>
          This build is missing its Supabase environment variables (<code>VITE_SUPABASE_URL</code>{' '}
          and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>), so the app can&apos;t start.
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          Re-publish from Lovable so the managed Supabase env is injected at build time, or set
          these variables in your deployment environment.
        </p>
        <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
          See <code>.env.example</code> for the required keys.
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={['light', 'dark', 'winter-frozen']}
      enableSystem={false}
      disableTransitionOnChange={false}
      // next-themes renders an inline <script> for server rendering. React
      // never runs a script it creates on the client, and React 19 logs a
      // console error for one unless its type marks it as data.
      scriptProps={{ type: 'text/plain' }}
    >
      <App />
    </ThemeProvider>
  );
}
