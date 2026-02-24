/**
 * Sentry initialization and configuration for production error logging
 * Optimized: Replay integration is lazy-loaded to reduce TTI
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://4118ea1dd42747921364d1aa6c4e2c8e@o4510601435152384.ingest.us.sentry.io/4510601452847104';

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

    // Session Replay sample rates (used when replay is added)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      // Filter network errors from message events (sent via captureMessage)
      const eventMessage = event.message || '';
      if (
        eventMessage.includes('Failed to fetch') ||
        eventMessage.includes('Load failed') ||
        eventMessage.includes('NetworkError')
      ) {
        return null;
      }

      // Filter network errors from exception values (covers cases where hint may not have originalException)
      const exceptionValue = event.exception?.values?.[0]?.value || '';
      if (
        exceptionValue.includes('Failed to fetch') ||
        exceptionValue.includes('Load failed') ||
        exceptionValue.includes('NetworkError')
      ) {
        return null;
      }

      const error = hint.originalException;

      // Ignore network errors that are expected
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Ignore common non-actionable errors
        if (
          message.includes('resizeobserver loop') ||
          message.includes('loading chunk') ||
          message.includes('failed to fetch') ||
          message.includes('load failed') ||
          message.includes('networkerror') ||
          message.includes('network request failed')
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
      requestIdleCallback(() => {
        addReplayIntegration();
      }, { timeout: 15000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        addReplayIntegration();
      }, 12000);
    }
  }
};

/**
 * Lazily add the replay integration to reduce initial bundle impact
 */
const addReplayIntegration = () => {
  try {
    const client = Sentry.getClient();
    if (client) {
      client.addIntegration(Sentry.replayIntegration());
    }
  } catch {
    // Silently fail - replay is non-critical
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
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', extra?: Record<string, unknown>) => {
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

export { Sentry };
