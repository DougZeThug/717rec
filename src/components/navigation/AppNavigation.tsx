import { BarChart3, Calendar, Clock, Home, Trophy, Users } from 'lucide-react';
import React from 'react';

import { useIsMobile } from '@/hooks/useMobile';

import BottomNav from './BottomNav';
import DesktopNav from './DesktopNav';

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();

  const navigationItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/schedule', label: 'Schedule', icon: Calendar },
    { href: '/stats', label: 'Standings', icon: BarChart3 },
    { href: '/playoffs', label: 'Playoffs', icon: Trophy },
    { href: '/history', label: 'History', icon: Clock },
    // Note: Timeslots is not included in bottom/desktop nav as it's admin-only
  ];

  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
