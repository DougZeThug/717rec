import { AnimatePresence, m } from 'framer-motion';
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  HelpCircle,
  Inbox,
  LayoutGrid,
  ListChecks,
  Mail,
  Palette,
  Search,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Users2,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import AutoScheduleTab from '@/components/admin/auto-schedule/AutoScheduleTab';
import BatchMatchCreationTab from '@/components/admin/batch-matches/BatchMatchCreationTab';
import BlindDrawSignupsTab from '@/components/admin/blind-draw/BlindDrawSignupsTab';
import ContactInboxSection from '@/components/admin/contact/ContactInboxSection';
import DivisionsTab from '@/components/admin/divisions/DivisionsTab';
import GettingStartedTab from '@/components/admin/help/GettingStartedTab';
import HeroCardsTab from '@/components/admin/hero-cards/HeroCardsTab';
import OpponentHistoryTab from '@/components/admin/opponent-history/OpponentHistoryTab';
import SeasonParticipationTab from '@/components/admin/participation/SeasonParticipationTab';
import PendingMatchesSection from '@/components/admin/PendingMatchesSection';
import RequestsTab from '@/components/admin/requests/RequestsTab';
import MassScoresTab from '@/components/admin/scores/MassScoresTab';
import SeasonManagementTab from '@/components/admin/seasons/SeasonManagementTab';
import TeamManagementTab from '@/components/admin/teams/TeamManagementTab';
import ThemeManagementTab from '@/components/admin/theme/ThemeManagementTab';
import TimeslotsTab from '@/components/admin/timeslots/TimeslotsTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/useMobile';
import { usePendingRequestsCount } from '@/hooks/useTeamRequests';
import { cn } from '@/lib/utils';

import AdminMobileNav from './AdminMobileNav';

interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  Component: React.ComponentType;
}

const adminMenuItems: AdminMenuItem[] = [
  { id: 'timeslots', label: 'Timeslots', icon: Timer, Component: TimeslotsTab },
  {
    id: 'batch-matches',
    label: 'Match Creation',
    icon: Sparkles,
    Component: BatchMatchCreationTab,
  },
  {
    id: 'auto-schedule',
    label: 'Auto Schedule',
    icon: CalendarClock,
    Component: AutoScheduleTab,
  },
  { id: 'matchups', label: 'Matchups', icon: Users2, Component: OpponentHistoryTab },
  { id: 'scores', label: 'Scores', icon: ListChecks, Component: MassScoresTab },
  { id: 'seasons', label: 'Season', icon: Calendar, Component: SeasonManagementTab },
  {
    id: 'participation',
    label: 'Participation',
    icon: ClipboardCheck,
    Component: SeasonParticipationTab,
  },
  { id: 'requests', label: 'Requests', icon: Inbox, Component: RequestsTab },
  { id: 'contact-inbox', label: 'Contact Inbox', icon: Mail, Component: ContactInboxSection },
  { id: 'teams', label: 'Teams', icon: Users, Component: TeamManagementTab },
  { id: 'divisions', label: 'Divisions', icon: Trophy, Component: DivisionsTab },
  { id: 'pending-matches', label: 'Pending', icon: Clock, Component: PendingMatchesSection },
  { id: 'hero-cards', label: 'Hero', icon: LayoutGrid, Component: HeroCardsTab },
  { id: 'themes', label: 'Themes', icon: Palette, Component: ThemeManagementTab },
  { id: 'blind-draw', label: 'Blind Draw', icon: Shuffle, Component: BlindDrawSignupsTab },
  { id: 'help', label: 'Help', icon: HelpCircle, Component: GettingStartedTab },
];

const STORAGE_KEY = 'adminActiveTab';

// Memoized animation props to prevent recreating objects on every render
const sidebarAnimateProps = { expanded: { width: 240 }, collapsed: { width: 60 } };
const sidebarTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };
const searchAnimateProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};
const labelAnimateProps = {
  initial: { opacity: 0, width: 0 },
  animate: { opacity: 1, width: 'auto' },
  exit: { opacity: 0, width: 0 },
};

const AdminSidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const { data: pendingRequestsCount } = usePendingRequestsCount();
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) || 'timeslots';
  });

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    sessionStorage.setItem(STORAGE_KEY, tabId);
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(
    () =>
      adminMenuItems.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const activeItem = useMemo(
    () => adminMenuItems.find((item) => item.id === activeTab),
    [activeTab]
  );

  // Mobile: Use grouped collapsible navigation
  if (isMobile) {
    const ActiveComponent = activeItem?.Component;

    return (
      <div className="space-y-4">
        <AdminMobileNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Content - render only active tab to avoid mounting all components */}
        {ActiveComponent && <ActiveComponent />}
      </div>
    );
  }

  // Desktop: Use sidebar
  const ActiveComponent = activeItem?.Component;

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar */}
      <m.aside
        initial={false}
        animate={isCollapsed ? sidebarAnimateProps.collapsed : sidebarAnimateProps.expanded}
        transition={sidebarTransition}
        className={cn(
          'flex flex-col bg-card border border-border rounded-lg overflow-hidden',
          'shrink-0'
        )}
      >
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!isCollapsed && (
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-sm"
            >
              Admin Menu
            </m.span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!isCollapsed && (
            <m.div {...searchAnimateProps} className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Menu items */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {filteredItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  'min-h-[44px]', // Touch target
                  activeTab === item.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <>
                      <m.span {...labelAnimateProps} className="truncate flex-1 text-left">
                        {item.label}
                      </m.span>
                      {item.id === 'requests' &&
                        pendingRequestsCount !== undefined &&
                        pendingRequestsCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-auto text-xs px-1.5 py-0.5 min-w-[20px] h-5"
                          >
                            {pendingRequestsCount}
                          </Badge>
                        )}
                    </>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </m.aside>

      {/* Content area - render only active tab to improve performance */}
      <div className="flex-1 min-w-0">{ActiveComponent && <ActiveComponent />}</div>
    </div>
  );
};

export default AdminSidebar;
