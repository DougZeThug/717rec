import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import type { NotificationRow as NotificationRecord } from '@/services/notifications/NotificationService';
import { formatNotificationDate } from '@/utils/formatNotificationDate';

interface NotificationRowProps {
  notification: NotificationRecord;
  /** Clock the expiry is judged against, so the list and the row agree. */
  currentTimeMs: number;
  onEdit: (notification: NotificationRecord) => void;
  onDelete: (notification: NotificationRecord) => void;
  isDeleting: boolean;
}

/**
 * One entry in "Recent notifications". Split out of NotificationsTab so neither
 * the list nor the row nests JSX deeply enough to stop being readable.
 */
const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  currentTimeMs,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const isExpired = notification.expires_at && Date.parse(notification.expires_at) < currentTimeMs;
  const posted = formatNotificationDate(notification.created_at);
  const expires = notification.expires_at ? formatNotificationDate(notification.expires_at) : null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h3 className="text-sm font-semibold text-foreground sm:truncate">
            {notification.title}
            {isExpired && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                Expired
              </span>
            )}
          </h3>
          <time
            dateTime={posted.iso}
            title={posted.iso}
            className="flex shrink-0 flex-col text-right text-[11px] leading-tight text-muted-foreground sm:items-end"
          >
            <span className="font-medium text-foreground/80 tabular-nums">{posted.absolute}</span>
            {posted.relative && <span>{posted.relative}</span>}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {notification.body}
        </p>
        {expires && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Expires <span className="tabular-nums">{expires.absolute}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(notification)}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(notification)}
          disabled={isDeleting}
          aria-label="Delete notification"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default NotificationRow;
