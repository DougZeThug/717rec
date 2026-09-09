import {
  Activity,
  Bell,
  Calendar,
  CalendarClock,
  ClipboardCheck,
  Clock,
  HelpCircle,
  Inbox,
  LayoutGrid,
  ListChecks,
  Mail,
  Palette,
  Scale,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Users2,
  Wrench,
} from 'lucide-react';
import React, { lazy } from 'react';

/**
 * The one list of admin console sections.
 *
 * The sidebar and the phone menu each used to keep their own copy, which is how
 * the Notifications section once shipped desktop-only and how the Hero section
 * ended up with two names. Both read this now, and the section id is the last
 * segment of the address: `scores` is `/admin/scores`.
 */

export interface AdminSection {
  /** Address segment and the id `switchAdminTab` understands. */
  id: string;
  label: string;
  icon: React.ElementType;
  Component: React.LazyExoticComponent<React.ComponentType>;
}

/** Group of sections the phone menu shows under one heading. */
export interface AdminSectionGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  sections: string[];
}

const TimeslotsTab = lazy(() => import('@/components/admin/timeslots/TimeslotsTab'));
const BatchMatchCreationTab = lazy(
  () => import('@/components/admin/batch-matches/BatchMatchCreationTab')
);
const AutoScheduleTab = lazy(() => import('@/components/admin/auto-schedule/AutoScheduleTab'));
const OpponentHistoryTab = lazy(
  () => import('@/components/admin/opponent-history/OpponentHistoryTab')
);
const MassScoresTab = lazy(() => import('@/components/admin/scores/MassScoresTab'));
const NotificationsTab = lazy(() => import('@/components/admin/notifications/NotificationsTab'));
const SeasonManagementTab = lazy(() => import('@/components/admin/seasons/SeasonManagementTab'));
const SeasonParticipationTab = lazy(
  () => import('@/components/admin/participation/SeasonParticipationTab')
);
const RequestsTab = lazy(() => import('@/components/admin/requests/RequestsTab'));
const ContactInboxSection = lazy(() => import('@/components/admin/contact/ContactInboxSection'));
const TeamManagementTab = lazy(() => import('@/components/admin/teams/TeamManagementTab'));
const DivisionsTab = lazy(() => import('@/components/admin/divisions/DivisionsTab'));
const PendingMatchesSection = lazy(() => import('@/components/admin/PendingMatchesSection'));
const HeroCardsTab = lazy(() => import('@/components/admin/hero-cards/HeroCardsTab'));
const ThemeManagementTab = lazy(() => import('@/components/admin/theme/ThemeManagementTab'));
const BlindDrawSignupsTab = lazy(() => import('@/components/admin/blind-draw/BlindDrawSignupsTab'));
const GettingStartedTab = lazy(() => import('@/components/admin/help/GettingStartedTab'));
const LiveCorrectionsSection = lazy(
  () => import('@/components/admin/live-corrections/LiveCorrectionsSection')
);
const LeagueNightStatusTab = lazy(
  () => import('@/components/admin/league-night-status/LeagueNightStatusTab')
);
const PowerMigrationReviewTab = lazy(
  () => import('@/components/admin/power-migration/PowerMigrationReviewTab')
);
const PowerScoreSandboxTab = lazy(
  () => import('@/components/admin/power-sandbox/PowerScoreSandboxTab')
);

/** Menu order. Adding a section here puts it in both menus and gives it a URL. */
export const ADMIN_SECTIONS: AdminSection[] = [
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
  {
    id: 'live-corrections',
    label: 'Live Corrections',
    icon: Wrench,
    Component: LiveCorrectionsSection,
  },
  { id: 'seasons', label: 'Season', icon: Calendar, Component: SeasonManagementTab },
  {
    id: 'participation',
    label: 'Participation',
    icon: ClipboardCheck,
    Component: SeasonParticipationTab,
  },
  { id: 'requests', label: 'Requests', icon: Inbox, Component: RequestsTab },
  { id: 'contact-inbox', label: 'Contact Inbox', icon: Mail, Component: ContactInboxSection },
  { id: 'notifications', label: 'Notifications', icon: Bell, Component: NotificationsTab },
  { id: 'teams', label: 'Teams', icon: Users, Component: TeamManagementTab },
  { id: 'divisions', label: 'Divisions', icon: Trophy, Component: DivisionsTab },
  {
    id: 'pending-matches',
    label: 'Score approvals',
    icon: Clock,
    Component: PendingMatchesSection,
  },
  { id: 'hero-cards', label: 'Hero', icon: LayoutGrid, Component: HeroCardsTab },
  { id: 'themes', label: 'Themes', icon: Palette, Component: ThemeManagementTab },
  { id: 'blind-draw', label: 'Blind Draw', icon: Shuffle, Component: BlindDrawSignupsTab },
  { id: 'help', label: 'Help', icon: HelpCircle, Component: GettingStartedTab },
  {
    id: 'league-night-status',
    label: 'League Night',
    icon: Activity,
    Component: LeagueNightStatusTab,
  },
  {
    id: 'power-migration',
    label: 'Power Score Review',
    icon: Scale,
    Component: PowerMigrationReviewTab,
  },
  {
    id: 'power-sandbox',
    label: 'Power Score Sandbox',
    icon: SlidersHorizontal,
    Component: PowerScoreSandboxTab,
  },
];

/** How the phone menu groups the sections. Every section belongs to exactly one. */
export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarClock,
    sections: ['timeslots', 'batch-matches', 'auto-schedule'],
  },
  {
    id: 'scores-stats',
    label: 'Scores & Stats',
    icon: ListChecks,
    sections: ['scores', 'matchups', 'pending-matches', 'power-sandbox'],
  },
  {
    id: 'corrections',
    label: 'Corrections',
    icon: Wrench,
    sections: ['live-corrections'],
  },
  {
    id: 'teams-players',
    label: 'Teams & Players',
    icon: Users,
    sections: ['teams', 'divisions', 'requests', 'contact-inbox', 'participation'],
  },
  {
    id: 'settings',
    label: 'Settings & Content',
    icon: LayoutGrid,
    sections: ['seasons', 'hero-cards', 'themes', 'blind-draw', 'notifications', 'help'],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Activity,
    sections: ['league-night-status', 'power-migration'],
  },
];

/** Opened when nothing else has been chosen. */
export const DEFAULT_ADMIN_SECTION = 'timeslots';

export const findAdminSection = (id: string | undefined): AdminSection | undefined =>
  ADMIN_SECTIONS.find((section) => section.id === id);

/** Whether a value names a real section, for anything read from outside the app. */
export const isAdminSectionId = (value: string | null | undefined): value is string =>
  typeof value === 'string' && ADMIN_SECTIONS.some((section) => section.id === value);

/** The group holding a section, used to open the right one in the phone menu. */
export const findAdminSectionGroup = (sectionId: string): AdminSectionGroup | undefined =>
  ADMIN_SECTION_GROUPS.find((group) => group.sections.includes(sectionId));
