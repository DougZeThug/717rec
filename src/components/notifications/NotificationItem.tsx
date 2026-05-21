import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useDeleteNotification } from '@/hooks/notifications/useNotificationMutations';
import type { NotificationRow } from '@/services/notifications/NotificationService';
import { cn } from '@/lib/utils';

interface Props {
  notification: NotificationRow;
  lastSeenAt: string;
}

const NotificationItem: React.FC<Props> = ({ notification, lastSeenAt }) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const del = useDeleteNotification();

  const isUnread =
    (Date.parse(notification.created_at) || 0) > (Date.parse(lastSeenAt) || 0);

  const rel = (() => {
    try {
      return formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
    } catch {
      return '';
    }
  })();

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
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-foreground">{notification.title}</h4>
          <span className="shrink-0 text-xs text-muted-foreground">{rel}</span>
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