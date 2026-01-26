/**
 * Google Analytics integration for 717REC
 * Provides wrapper functions for tracking page views and events
 */

// GA Measurement ID - set via environment or directly here
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-C2L4XZJ00B';

// Declare gtag on window
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

/**
 * Initialize Google Analytics
 * Called once on app startup
 */
export const initAnalytics = () => {
  if (!GA_MEASUREMENT_ID || !import.meta.env.PROD) {
    console.log('[Analytics] Disabled - no measurement ID or dev mode');
    return;
  }

  // Defer analytics loading to improve TTI
  // Analytics is non-critical and can wait until the page is interactive
  const loadAnalytics = () => {
    // Load gtag script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // We'll track manually for SPA
    });
  };

  // Use requestIdleCallback to defer until browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadAnalytics, { timeout: 3000 });
  } else {
    // Fallback: defer by 2 seconds
    setTimeout(loadAnalytics, 2000);
  }
};

/**
 * Track a page view
 */
export const trackPageView = (path: string, title?: string) => {
  if (!GA_MEASUREMENT_ID || !import.meta.env.PROD) {
    console.log('[Analytics] Page view:', path, title);
    return;
  }

  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
};

/**
 * Track a custom event
 */
export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  if (!GA_MEASUREMENT_ID || !import.meta.env.PROD) {
    console.log('[Analytics] Event:', eventName, params);
    return;
  }

  window.gtag?.('event', eventName, params);
};

/**
 * Set user ID for tracking
 */
export const setAnalyticsUser = (userId: string | null) => {
  if (!GA_MEASUREMENT_ID || !import.meta.env.PROD) {
    console.log('[Analytics] Set user:', userId);
    return;
  }

  window.gtag?.('config', GA_MEASUREMENT_ID, {
    user_id: userId,
  });
};

// ============================================
// Pre-defined event helpers
// ============================================

export const trackAuth = (action: 'login' | 'signup' | 'logout') => {
  trackEvent('auth', { action });
};

export const trackScoreSubmission = (matchId: string) => {
  trackEvent('score_submission', { match_id: matchId });
};

export const trackBracketView = (bracketId: string, bracketTitle: string) => {
  trackEvent('bracket_view', { bracket_id: bracketId, bracket_title: bracketTitle });
};

export const trackTeamView = (teamId: string, teamName: string) => {
  trackEvent('team_view', { team_id: teamId, team_name: teamName });
};

export const trackContactForm = (subject: string) => {
  trackEvent('contact_form_submit', { subject });
};
