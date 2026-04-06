/**
 * Sentry initialization and configuration for production error logging
 * Optimized: Replay integration is lazy-loaded to reduce TTI
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

let isInitialized = false;

export const initSentry = () => {
  // Prevent multiple initializations (HMR can cause this)
  if (isInitialized) {
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured - error reporting disabled');
    return;
  }

  isInitialized = true;

  // Initialize Sentry WITHOUT replay integration for faster TTI
  // Replay will be added lazily after page becomes interactive
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Only send errors in production
    enabled: import.meta.env.PROD,

    // Send default PII data to Sentry (e.g., automatic IP address collection)
    sendDefaultPii: true,

    // NO integrations on initial load - replay added lazily below
    integrations: [],

    // Suppress fetch breadcrumbs that are network failures (no status code)
    beforeBreadcrumb(breadcrumb) {
      if (
        breadcrumb.category === 'fetch' &&
        breadcrumb.level === 'error' &&
        breadcrumb.data &&
        !breadcrumb.data.status_code
      ) {
        return null;
      }
      return breadcrumb;
    },

    // Sample rate for performance monitoring (0 = disabled, 1 = 100%)
    tracesSampleRate: 0.1,

    // Scope distributed tracing to our own API domain (avoids CORS issues)
    tracePropagationTargets: ['localhost', /^https:\/\/wcitdamvochthvxvtxyb\.supabase\.co/],

    // Session Replay sample rates (used when replay is added)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // ── Browser-level noise filters (non-network) ──
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('resizeobserver loop') || msg.includes('loading chunk')) {
          return null;
        }
      }

      // ── Network error filter — only suppress actual browser TypeError fetch failures ──
      // Browser throws `TypeError: Failed to fetch` / `TypeError: Load failed` / `TypeError: NetworkError`
      // for genuine network issues. Application errors like "Failed to fetch match data" must NOT be dropped.
      const isNetworkTypeError = error instanceof TypeError;

      if (isNetworkTypeError) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('failed to fetch') ||
          msg.includes('load failed') ||
          msg.includes('networkerror') ||
          msg.includes('network request failed')
        ) {
          return null;
        }
      }

      // For captureMessage events (no originalException), only filter if it looks like a bare network error
      if (!error && event.message) {
        const m = event.message;
        if (
          m === 'Failed to fetch' ||
          m === 'Load failed' ||
          m === 'NetworkError' ||
          m === 'Network request failed'
        ) {
          return null;
        }
      }

      return event;
    },

    // Add additional context
    initialScope: {
      tags: {
        app: '717rec',
      },
    },
  });

  // Lazily add replay integration well after page becomes interactive
  // This defers ~40KB of JS until well after TTI window
  if (import.meta.env.PROD) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          addLazyIntegrations();
        },
        { timeout: 15000 }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        addLazyIntegrations();
      }, 12000);
    }
  }
};

/**
 * Lazily add replay + browser tracing integrations to reduce initial bundle impact
 */
const addLazyIntegrations = () => {
  try {
    const client = Sentry.getClient();
    if (client) {
      client.addIntegration(Sentry.replayIntegration());
      client.addIntegration(Sentry.browserTracingIntegration());
    }
  } catch {
    // Silently fail - these integrations are non-critical
  }
};

/**
 * Capture an error and send to Sentry
 * Wrapped in try/catch to handle CORS failures gracefully
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  // Always log to console for debugging
  console.error('[Error]:', error, context);

  if (!import.meta.env.PROD) {
    return;
  }

  try {
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (sentryError) {
    // Sentry failed (likely CORS or network issue) - error is already logged above
    console.warn('[Sentry] Failed to send error report (CORS/network issue):', sentryError);
  }
};

/**
 * Capture a message and send to Sentry
 * Wrapped in try/catch to handle CORS failures gracefully
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
) => {
  // Always log to console for debugging
  console.log(`[${level}]:`, message);

  if (!import.meta.env.PROD) {
    return;
  }

  try {
    Sentry.captureMessage(message, {
      level,
      extra,
    });
  } catch (sentryError) {
    // Sentry failed (likely CORS or network issue) - message is already logged above
    console.warn('[Sentry] Failed to send message (CORS/network issue):', sentryError);
  }
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null) => {
  Sentry.setUser(user);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Thin metrics helpers — wraps Sentry.metrics for convenience.
 * Metrics only fire in production (guarded by the Sentry client's `enabled` flag).
 */
export const metrics = {
  count: (name: string, value?: number, attributes?: Record<string, string>) =>
    Sentry.metrics.count(name, value ?? 1, { attributes }),
  gauge: (name: string, value: number, attributes?: Record<string, string>) =>
    Sentry.metrics.gauge(name, value, { attributes }),
  distribution: (name: string, value: number, attributes?: Record<string, string>) =>
    Sentry.metrics.distribution(name, value, { attributes }),
};

export { Sentry };
