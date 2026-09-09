import {
  Bell,
  ChevronDown,
  ExternalLink,
  FileText,
  ListChecks,
  Server,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
  Wrench,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { switchAdminTab } from '@/utils/adminTabs';

import { OPS_LINKS } from './opsLinks';

/**
 * The jobs a league night is actually made of, in the order they come up:
 * set the times, make the matches, take the scores, fix what went wrong, tell
 * everyone, and run the draw. Each icon is the one its section carries in the
 * admin menu, so the button and the menu item look like the same thing.
 *
 * Before this (UX audit A-16) only Live corrections and Mass score entry were
 * here, which is two of the night's jobs out of nine.
 */
const SECTION_ACTIONS: { id: string; label: string; Icon: typeof Timer }[] = [
  { id: 'timeslots', label: 'Timeslots', Icon: Timer },
  { id: 'batch-matches', label: 'Match Creation', Icon: Sparkles },
  { id: 'scores', label: 'Mass score entry', Icon: ListChecks },
  { id: 'live-corrections', label: 'Live corrections', Icon: Wrench },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'blind-draw', label: 'Blind Draw', Icon: Shuffle },
];

/**
 * Playoff administration is not a dashboard section — brackets are created and
 * advanced from the public playoffs page, using an admin toolbar there. The
 * Help section links out the same way.
 */
const PLAYOFFS_PATH = '/playoffs';

const DEVELOPER_LINKS: { href: string; label: string; Icon: typeof Server }[] = [
  { href: OPS_LINKS.supabaseStatus, label: 'Supabase status', Icon: Server },
  { href: OPS_LINKS.lovableStatus, label: 'Lovable status', Icon: Server },
  { href: OPS_LINKS.supabaseSqlEditor, label: 'SQL editor', Icon: FileText },
  { href: OPS_LINKS.operationsDoc, label: 'Playbook', Icon: FileText },
];

/** The row of buttons that open a league-night section, plus the Playoffs link. */
const SectionActions: React.FC = () => (
  <div className="flex flex-wrap gap-2">
    {SECTION_ACTIONS.map(({ id, label, Icon }) => (
      <Button key={id} variant="secondary" size="sm" onClick={() => switchAdminTab(id)}>
        <Icon className="mr-2 size-4" aria-hidden="true" />
        {label}
      </Button>
    ))}
    <Button variant="secondary" size="sm" asChild>
      <Link to={PLAYOFFS_PATH}>
        <Trophy className="mr-2 size-4" aria-hidden="true" />
        Playoffs
      </Link>
    </Button>
  </div>
);

const DeveloperLinks: React.FC = () => (
  <div className="flex flex-wrap gap-2">
    {DEVELOPER_LINKS.map(({ href, label, Icon }) => (
      <Button key={label} variant="outline" size="sm" asChild>
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Icon className="mr-2 size-4" aria-hidden="true" />
          {label}
          <ExternalLink className="ml-2 size-3" aria-hidden="true" />
        </a>
      </Button>
    ))}
  </div>
);

/**
 * The developer links, closed by default. Radix unmounts closed content, so
 * these are out of the tab order until asked for — the SQL editor used to sit
 * in the same row as the buttons an admin presses during a match (A-16).
 *
 * The trigger stays a real <button> because CollapsibleTrigger's asChild clones
 * its handler onto the child element; a function component would swallow it.
 */
const DeveloperDisclosure: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileText className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Developer</span>
          <ChevronDown
            className={cn('size-4 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <DeveloperLinks />
      </CollapsibleContent>
    </Collapsible>
  );
};

const QuickActionsCard: React.FC = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Quick actions</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <SectionActions />
      <DeveloperDisclosure />
    </CardContent>
  </Card>
);

export default QuickActionsCard;
