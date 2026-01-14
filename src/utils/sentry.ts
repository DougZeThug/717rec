/**
 * Sentry initialization and configuration for production error logging
 */
import * as Sentry from '@sentry/react';

const SENTRY_DSN =
  import.meta.env.VITE_SENTRY_DSN ||
  'https://4118ea1dd42747921364d1aa6c4e2c8e@o4510601435152384.ingest.us.sentry.io/4510601452847104';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured - error reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Only send errors in production
    enabled: import.meta.env.PROD,

    // Send default PII data to Sentry (e.g., automatic IP address collection)
    sendDefaultPii: true,

    // Session Replay integration
    integrations: [
      Sentry.replayIntegration(),
    ],

    // Sample rate for performance monitoring (0 = disabled, 1 = 100%)
    tracesSampleRate: 0.1,

    // Session Replay sample rates
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Ignore network errors that are expected
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Ignore common non-actionable errors
        if (
          message.includes('resizeobserver loop') ||
          message.includes('loading chunk') ||
          message.includes('failed to fetch') ||
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
};

/**
 * Capture an error and send to Sentry
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (!import.meta.env.PROD) {
    console.error('[Sentry would capture]:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message and send to Sentry
 */
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (!import.meta.env.PROD) {
    console.log(`[Sentry would capture ${level}]:`, message);
    return;
  }

  Sentry.captureMessage(message, level);
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
