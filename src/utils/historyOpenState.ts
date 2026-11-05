/**
 * Which History seasons and divisions are open, kept for this browser tab only.
 *
 * Why: a team name on the History page is now a link. Without a memory, the
 * Back button from the team page would return to a page with every season
 * closed. The page remembers the open ones in session storage (it goes away when
 * the tab closes, so a new tab starts closed, and a reload keeps them open).
 *
 * One JSON object under one key, `{ [key]: boolean }`, with keys such as
 * `season:<seasonId>` and `division:<seasonId>:<divisionName>`.
 *
 * Every storage access is in a try/catch and fails silently: a browser that
 * blocks storage, a full quota, or a value that is not what we wrote just
 * means the page behaves as it did before (everything closed).
 */

const STORAGE_KEY = 'history_open_state';

/** The saved object, keeping only the boolean values. Empty when anything is wrong. */
const readAll = (): Record<string, boolean> => {
  const saved: Record<string, boolean> = {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return saved;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return saved;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') saved[key] = value;
    }
  } catch {
    // ignore storage and JSON errors (private mode, corrupt value, etc.)
  }
  return saved;
};

/** Whether the season or division with this key was left open or closed, or undefined if never set. */
export const readOpen = (key: string): boolean | undefined => {
  const value: unknown = readAll()[key];
  return typeof value === 'boolean' ? value : undefined;
};

/** Remember that the season or division with this key is now open or closed. */
export const writeOpen = (key: string, open: boolean): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [key]: open }));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
};

/** Forget everything. The History page does this when it is opened fresh (not by Back or reload). */
export const clearOpenState = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};
