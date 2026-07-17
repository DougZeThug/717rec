/**
 * Google Analytics integration for 717REC.
 *
 * Loads gtag.js with a short (1s) idle window and uses beacon transport so
 * pageviews still land when a mobile PWA user closes the tab mid-load. The
 * previous 8s idle deferral meant most short mobile sessions never fired a
 * pageview at all — see docs/OPERATIONS.md.
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-C2L4XZJ00B';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const analyticsDisabled = (): boolean => !GA_MEASUREMENT_ID || !import.meta.env.PROD;

let gtagReady = false;

const loadGtag = () => {
  if (gtagReady) return;
  gtagReady = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    transport_type: 'beacon',
  });
};

export const initAnalytics = () => {
  if (analyticsDisabled()) {
    console.log('[Analytics] Disabled - no measurement ID or dev mode'); // skipcq: JS-0002
    return;
  }

  // Load ASAP once the document is interactive, but never later than 1s.
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadGtag, { timeout: 1000 });
    } else {
      setTimeout(loadGtag, 500);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    schedule();
  } else {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  }
};

export const trackPageView = (path: string, title?: string) => {
  if (analyticsDisabled()) {
    console.log('[Analytics] Page view:', path, title); // skipcq: JS-0002
    return;
  }

  // If the tag hasn't loaded yet, load it now so this first pageview isn't lost.
  if (!gtagReady) loadGtag();

  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    transport_type: 'beacon',
  });
};

const trackEvent = (eventName: string, params?: Record<string, string | number | boolean>) => {
  if (analyticsDisabled()) {
    console.log('[Analytics] Event:', eventName, params); // skipcq: JS-0002
    return;
  }

  window.gtag?.('event', eventName, { ...(params ?? {}), transport_type: 'beacon' });
};

// ============================================
// Pre-defined event helpers
// ============================================

export const trackContactForm = (subject: string) => {
  trackEvent('contact_form_submit', { subject });
};
