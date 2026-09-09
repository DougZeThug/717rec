import {
  DEFAULT_ADMIN_SECTION,
  isAdminSectionId,
} from '@/components/admin/dashboard/adminSections';

/**
 * Moving between admin dashboard sections from inside a section.
 *
 * Each section has its own address (`/admin/scores`), so the dashboard shell
 * changes section by navigating. A control inside one section usually cannot
 * navigate for itself — a toast action outlives the component that raised it,
 * and the Help tab's steps live in a plain data list with no hook available —
 * so these two functions stay the channel: a control calls `switchAdminTab`,
 * the shell listens with `subscribeToAdminTabRequests` and navigates. Nothing
 * reloads the page.
 *
 * The remembered section is a separate job: it only answers what a bare
 * `/admin` should open, since the user menu links there without naming one.
 */

/** Session storage key holding the section a bare `/admin` should reopen. */
export const ADMIN_TAB_STORAGE_KEY = 'adminActiveTab';

/**
 * Window event carrying a requested tab id. Deliberately not exported: the
 * functions below are the whole interface, and nothing outside should be
 * dispatching or listening for this by hand.
 */
const ADMIN_TAB_EVENT = 'admin:switch-tab';

/** Remember the open section for the next bare `/admin` visit. */
export const rememberAdminSection = (sectionId: string): void => {
  try {
    sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, sectionId);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};

/**
 * The section a bare `/admin` should open. Falls back to the default for a
 * first visit, for a value left behind by an older build, and for a browser
 * that refuses session storage.
 */
export const readRememberedAdminSection = (): string => {
  try {
    const stored = sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    if (isAdminSectionId(stored)) return stored;
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  return DEFAULT_ADMIN_SECTION;
};

/** Ask the admin dashboard to open a different section. */
export const switchAdminTab = (tabId: string): void => {
  rememberAdminSection(tabId);
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
