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
import type React from 'react';

/**
 * Every section of the admin dashboard, described for the Help section.
 *
 * The ids and labels must match `AdminSidebar`'s menu, which is the source of
 * truth for what the dashboard contains. `adminMenuParity.test.ts` fails if this
 * list drifts from it, so a new section cannot be added without documenting it.
 *
 * This is a plain data module, not a component, so the parity test can import it
 * without rendering anything.
 */
export interface AdminSectionGuideEntry {
  /** Section id understood by `switchAdminTab`. */
  id: string;
  /** The name shown in the sidebar. */
  label: string;
  icon: React.ElementType;
  /** One line, in the words an admin would use. */
  description: string;
}

export const adminSectionGuide: AdminSectionGuideEntry[] = [
  {
    id: 'timeslots',
    label: 'Timeslots',
    icon: Timer,
    description: 'Book teams into a league-night time block, or give them a bye.',
  },
  {
    id: 'batch-matches',
    label: 'Match Creation',
    icon: Sparkles,
    description: 'Create a night of matches by hand, one row per pairing.',
  },
  {
    id: 'auto-schedule',
    label: 'Auto Schedule',
    icon: CalendarClock,
    description: 'Build a balanced set of matchups for a division automatically.',
  },
  {
    id: 'matchups',
    label: 'Matchups',
    icon: Users2,
    description: 'See who has played whom, and how often.',
  },
  {
    id: 'scores',
    label: 'Scores',
    icon: ListChecks,
    description: 'Enter the results for a whole night in one pass.',
  },
  {
    id: 'live-corrections',
    label: 'Live Corrections',
    icon: Wrench,
    description: 'Fix a round, a game winner, or a result from a live-scored match.',
  },
  {
    id: 'seasons',
    label: 'Season',
    icon: Calendar,
    description: 'Create a season, set its dates, and archive it when it ends.',
  },
  {
    id: 'participation',
    label: 'Participation',
    icon: ClipboardCheck,
    description: 'See which teams are taking part in the season.',
  },
  {
    id: 'requests',
    label: 'Requests',
    icon: Inbox,
    description: 'Approve or reject the changes teams ask for.',
  },
  {
    id: 'contact-inbox',
    label: 'Contact Inbox',
    icon: Mail,
    description: 'Read the messages sent from the Contact page.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Post an announcement to the notification bell.',
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    description: 'Add and edit teams, their logos, and their members.',
  },
  {
    id: 'divisions',
    label: 'Divisions',
    icon: Trophy,
    description: 'Create and edit the divisions that teams play in.',
  },
  {
    id: 'pending-matches',
    label: 'Score approvals',
    icon: Clock,
    description: 'Approve or reject the scores players reported.',
  },
  {
    id: 'hero-cards',
    label: 'Hero',
    icon: LayoutGrid,
    description: 'Manage the cards at the top of the home page.',
  },
  {
    id: 'themes',
    label: 'Themes',
    icon: Palette,
    description: 'Turn a seasonal look for the site on or off.',
  },
  {
    id: 'blind-draw',
    label: 'Blind Draw',
    icon: Shuffle,
    description: 'See and clear the signups for a blind-draw event.',
  },
  {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    description: 'This page: the setup steps, and what every section does.',
  },
  {
    id: 'league-night-status',
    label: 'League Night',
    icon: Activity,
    description: 'The league-night dashboard: what needs attention right now.',
  },
  {
    id: 'power-migration',
    label: 'Power Score Review',
    icon: Scale,
    description: 'Check the state of the Power Score rollout.',
  },
  {
    id: 'power-sandbox',
    label: 'Power Score Sandbox',
    icon: SlidersHorizontal,
    description: 'Try Power Score settings without changing anything.',
  },
];
