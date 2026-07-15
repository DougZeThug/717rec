import React from 'react';

import { useIsMobile } from '@/hooks/useMobile';

import BottomNav from './BottomNav';
import DesktopNav from './DesktopNav';

/** App-wide navigation chrome: bottom tab bar on mobile, top nav on desktop. */
const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
