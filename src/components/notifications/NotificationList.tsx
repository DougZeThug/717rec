import React from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { NotificationRow } from '@/services/notifications/NotificationService';

import NotificationItem from './NotificationItem';

interface Props {
  notifications: NotificationRow[];
  lastSeenAt: string;
  isLoading: boolean;
}

const NotificationList: React.FC<Props> = ({ notifications, lastSeenAt, isLoading }) => {
  if (isLoading && notifications.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">Loading notifications…</p>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
    );
  }

  return (
    <ScrollArea className="max-h-[400px] pr-2">
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} lastSeenAt={lastSeenAt} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default NotificationList;