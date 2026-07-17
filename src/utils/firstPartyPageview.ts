/**
 * First-party pageview beacon. Fires a POST to the `pageview` edge function
 * on every route change, so we count real usage even when the Lovable
 * dashboard or Google Analytics undercount (PWA-cached sessions, adblockers,
 * users who close the tab before gtag loads).
 */

export type UaClass = 'mobile-ios' | 'mobile-android' | 'mobile-other' | 'desktop' | 'unknown';

export const classifyUserAgent = (ua: string): UaClass => {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  const isMobile = /mobi|android|iphone|ipad|ipod/.test(lower);
  if (/iphone|ipad|ipod/.test(lower)) return 'mobile-ios';
  if (/android/.test(lower)) return 'mobile-android';
  if (isMobile) return 'mobile-other';
  return 'desktop';
};

const buildEndpoint = (): string | null => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/pageview`;
};

const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export interface PageviewPayload {
  path: string;
  ua_class: UaClass;
}

/**
 * POST the payload. Prefers `navigator.sendBeacon` (survives tab close);
 * falls back to `fetch({ keepalive: true })`. Never throws.
 */
export const sendFirstPartyPageview = (payload: PageviewPayload): void => {
  if (!import.meta.env.PROD) return;
  const endpoint = buildEndpoint();
  if (!endpoint || !anonKey) return;

  try {
    const body = JSON.stringify(payload);

    // sendBeacon can't set custom headers, so we route it through fetch when
    // the anon key is required. Supabase edge functions require the apikey
    // header even for functions with verify_jwt=false.
    void fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body,
    }).catch(() => {
      /* swallow — analytics is best-effort */
    });
  } catch {
    /* swallow */
  }
};
