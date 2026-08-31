/**
 * Moving between admin dashboard sections from inside a section.
 *
 * `AdminSidebar` owns the active tab in local state, so a control in one tab
 * cannot simply set it. These two functions are the channel: a control calls
 * `switchAdminTab`, the sidebar listens with `subscribeToAdminTabRequests` and
 * changes tab. Nothing reloads the page.
 */

/** Session storage key the sidebar uses to remember the open tab. */
export const ADMIN_TAB_STORAGE_KEY = 'adminActiveTab';

/** Window event carrying a requested tab id. */
export const ADMIN_TAB_EVENT = 'admin:switch-tab';

/** Ask the admin dashboard to open a different section. */
export const switchAdminTab = (tabId: string): void => {
  try {
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, tabId);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  window.dispatchEvent(new CustomEvent<string>(ADMIN_TAB_EVENT, { detail: tabId }));
};

/**
 * Listen for tab requests. Returns an unsubscribe function, so it can be
 * returned directly from a `useEffect`.
 */
export const subscribeToAdminTabRequests = (onRequest: (tabId: string) => void): (() => void) => {
  const handler = (event: Event) => {
    const tabId = (event as CustomEvent<string>).detail;
    if (typeof tabId === 'string' && tabId) onRequest(tabId);
  };

  window.addEventListener(ADMIN_TAB_EVENT, handler);
  return () => window.removeEventListener(ADMIN_TAB_EVENT, handler);
};
