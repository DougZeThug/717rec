import React from 'react';

import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/ui/theme/ThemeToggle';
import { cn } from '@/lib/utils';

interface NavActionsProps {
  className?: string;
  size?: 'default' | 'sm';
}

const NavActions: React.FC<NavActionsProps> = React.memo(({ className, size = 'default' }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <UserMenu />
      <NotificationBell />
      <ThemeToggle size={size} />
    </div>
  );
});

NavActions.displayName = 'NavActions';

export default NavActions;
