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

const QuickActionsCard: React.FC = () => {
  const [developerOpen, setDeveloperOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        <Collapsible open={developerOpen} onOpenChange={setDeveloperOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <FileText className="size-4" aria-hidden="true" />
                Developer
              </span>
              <ChevronDown
                className={cn('size-4 transition-transform', developerOpen && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
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
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default QuickActionsCard;
