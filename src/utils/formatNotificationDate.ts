import { formatDistanceToNow } from 'date-fns';

const EST_TIME_ZONE = 'America/New_York';

export interface FormattedNotificationDate {
  absolute: string;
  relative: string;
  iso: string;
}

/**
 * Format a UTC ISO timestamp for notification display.
 * Absolute time is rendered in EST to match the rest of the app
 * (see mem://architecture/event-date-timezone-handling-est).
 */
export const formatNotificationDate = (
  iso: string | null | undefined
): FormattedNotificationDate => {
  if (!iso) return { absolute: '', relative: '', iso: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { absolute: '', relative: '', iso };

  const absolute = (() => {
    try {
      return date.toLocaleString('en-US', {
        timeZone: EST_TIME_ZONE,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      });
    } catch {
      return date.toISOString();
    }
  })();

  const relative = (() => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return { absolute, relative, iso };
};
