import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useDeleteNotification } from '@/hooks/notifications/useNotificationMutations';
import type { NotificationRow } from '@/services/notifications/NotificationService';
import { cn } from '@/lib/utils';
import { formatNotificationDate } from '@/utils/formatNotificationDate';

interface Props {
  notification: NotificationRow;
  lastSeenAt: string;
}

const NotificationItem: React.FC<Props> = ({ notification, lastSeenAt }) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const del = useDeleteNotification();

  const isUnread =
    (Date.parse(notification.created_at) || 0) > (Date.parse(lastSeenAt) || 0);

  const { absolute, relative, iso } = formatNotificationDate(notification.created_at);

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <span
        className={cn(
          'mt-1.5 inline-block size-2 shrink-0 rounded-full',
          isUnread ? 'bg-primary' : 'bg-transparent'
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h4 className="text-sm font-semibold text-foreground sm:truncate">{notification.title}</h4>
          <time
            dateTime={iso}
            title={iso}
            className="flex shrink-0 flex-col text-right text-[11px] leading-tight text-muted-foreground sm:items-end"
          >
            <span className="font-medium text-foreground/80 tabular-nums">{absolute}</span>
            {relative && <span className="text-muted-foreground">{relative}</span>}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {notification.body}
        </p>
      </div>
      {isAdminAccessGranted && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => del.mutate(notification.id)}
          disabled={del.isPending}
          aria-label="Delete notification"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
};

export default NotificationItem;