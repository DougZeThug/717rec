import React from 'react';

import BottomNav from './BottomNav';

/**
 * App-wide navigation chrome below the page: the phone tab bar, and nothing on
 * a desktop.
 *
 * There used to be a `DesktopNav` pill bar here too — Standings, Schedule and
 * Teams, three links the header already carries, rendered under the page content
 * where nobody looks. It was one of four navigation surfaces that disagreed
 * about what the app contains (UX audit X-02), so it is gone. The command
 * palette it used to host moved into the header, which is where its search
 * button belongs.
 *
 * `BottomNav` returns null above 768 px, so this renders nothing on a desktop.
 */
const AppNavigation: React.FC = () => <BottomNav />;

export default AppNavigation;
