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

/**
 * Remember the open section for the next bare `/admin` visit.
 *
 * Called by the dashboard for the section it renders, so the memory always
 * matches what was really on screen — including a section reached by typing its
 * address, and never a switch the admin cancelled.
 */
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

/** What a section asks for: which section, and optionally what to open it on. */
interface AdminTabRequest {
  tabId: string;
  /** A query string including its leading `?`, or nothing. */
  search?: string;
}

/**
 * Ask the admin dashboard to open a different section.
 *
 * `search` lets one section hand facts to the next one — the night, the team
 * and the block that the Requests approval toast sends to Timeslots. It travels
 * in the address rather than in the event, so the section that receives it can
 * be reloaded, shared and stepped back to like any other page. A switch from
 * the menu passes nothing, which is what clears a stale one.
 *
 * Deliberately does **not** record the section: the shell can refuse the switch
 * when the open section holds unsaved work, and recording here would leave a
 * refused section as the one a bare `/admin` reopens. The dashboard records
 * whichever section it actually renders instead.
 */
export const switchAdminTab = (tabId: string, search?: string): void => {
  window.dispatchEvent(
    new CustomEvent<AdminTabRequest>(ADMIN_TAB_EVENT, { detail: { tabId, search } })
  );
};

/**
 * Listen for tab requests. Returns an unsubscribe function, so it can be
 * returned directly from a `useEffect`.
 */
export const subscribeToAdminTabRequests = (
  onRequest: (tabId: string, search?: string) => void
): (() => void) => {
  const handler = (event: Event) => {
    const request = (event as CustomEvent<AdminTabRequest>).detail;
    if (!request || typeof request.tabId !== 'string' || !request.tabId) return;
    onRequest(request.tabId, request.search);
  };

  window.addEventListener(ADMIN_TAB_EVENT, handler);
  return () => window.removeEventListener(ADMIN_TAB_EVENT, handler);
};
