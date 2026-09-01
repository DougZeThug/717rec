/**
 * Helpers for an `<input type="datetime-local">`.
 *
 * The control reads and writes a wall-clock string with no zone —
 * "2026-09-15T18:30" — while the database stores a UTC ISO timestamp. These two
 * functions convert between them using the browser's own zone, which is what an
 * admin typing a time means by it.
 */

/** Convert a datetime-local value to a UTC ISO string. Empty input gives null. */
export const localInputToIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

/** Convert a stored ISO timestamp back to a datetime-local value. */
export const isoToLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};
