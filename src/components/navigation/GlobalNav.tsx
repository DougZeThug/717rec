import React from 'react';

import { useIsMobile } from '@/hooks/useMobile';

import BottomNav from './BottomNav';
import DesktopNav from './DesktopNav';

export const GlobalNav = React.memo(() => {
  const isMobile = useIsMobile();

  // Only render the nav that's actually needed - prevents running hooks in hidden component
  return isMobile ? <BottomNav /> : <DesktopNav />;
});

GlobalNav.displayName = 'GlobalNav';

export default GlobalNav;
