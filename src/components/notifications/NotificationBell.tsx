import { Bell } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useNotificationsRealtime } from '@/hooks/notifications/useNotificationsRealtime';
import { useUnreadNotifications } from '@/hooks/notifications/useUnreadNotifications';
import { cn } from '@/lib/utils';

import NotificationList from './NotificationList';
import QuickPostNotificationForm from './QuickPostNotificationForm';

interface Props {
  className?: string;
}

const NotificationBell: React.FC<Props> = ({ className }) => {
  useNotificationsRealtime();
  const { notifications, unreadCount, lastSeenAt, isLoading, markAllSeen } =
    useUnreadNotifications();
  const { isAdminAccessGranted } = useAdminAccess();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) markAllSeen();
  };

  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              aria-hidden
            >
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {notifications.length} recent
              </span>
            )}
          </div>
          {isAdminAccessGranted && <QuickPostNotificationForm />}
          <NotificationList
            notifications={notifications}
            lastSeenAt={lastSeenAt}
            isLoading={isLoading}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;