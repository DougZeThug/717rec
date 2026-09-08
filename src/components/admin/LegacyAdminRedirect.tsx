import React, { useLayoutEffect } from 'react';
import { Navigate } from 'react-router';

import { switchAdminTab } from '@/utils/adminTabs';

interface LegacyAdminRedirectProps {
  /** Sidebar id of the section the old address was a page for. */
  section: string;
}

/**
 * Sends a legacy admin address into the console, opening the section it used to
 * be a page for.
 *
 * Choosing the section first is the point: `AdminSidebar` restores whatever
 * section was last open from session storage, so a bare redirect would drop an
 * old `/timeslots` bookmark onto whichever unrelated tool the admin used last.
 * The write happens in a layout effect, which runs before the effect `Navigate`
 * uses, and so before the dashboard mounts and reads the value.
 */
export const LegacyAdminRedirect: React.FC<LegacyAdminRedirectProps> = ({ section }) => {
  useLayoutEffect(() => {
    switchAdminTab(section);
  }, [section]);

  return <Navigate to="/admin" replace />;
};
