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
    // Two Radix ScrollArea quirks, both fixed here only (the shared ScrollArea is left alone):
    // the viewport is `size-full`, which does not resolve under a max-height, so it grew to the
    // whole list and nothing below 400px could be scrolled to; and its content wrapper is a
    // `display: table` box that grows to the longest line, so a long title was cut off.
    <ScrollArea className="max-h-[400px] pr-2 [&>[data-radix-scroll-area-viewport]]:max-h-[400px] [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} lastSeenAt={lastSeenAt} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default NotificationList;
