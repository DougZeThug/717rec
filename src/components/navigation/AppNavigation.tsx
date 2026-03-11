import React from 'react';

import { useIsMobile } from '@/hooks/useMobile';

import BottomNav from './BottomNav';
import DesktopNav from './DesktopNav';

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
