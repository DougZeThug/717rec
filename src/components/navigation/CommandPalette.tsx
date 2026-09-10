import {
  BarChart3,
  Calendar,
  Clock,
  GitCompareArrows,
  Home,
  Lightbulb,
  MessageSquare,
  Search,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useTeamsQuery } from '@/hooks/teams';
import { cn } from '@/lib/utils';
import { toTeamSlug } from '@/utils/teamSlug';

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const quickActions = [
  { name: 'Go to Home', icon: Home, path: '/' },
  { name: 'View Standings', icon: BarChart3, path: '/stats' },
  { name: 'View Schedule', icon: Calendar, path: '/schedule' },
  { name: 'Browse Teams', icon: Users, path: '/teams' },
  { name: 'View Playoffs', icon: Trophy, path: '/playoffs' },
  { name: 'Season History', icon: Clock, path: '/history' },
  { name: 'Message Board', icon: MessageSquare, path: '/message-board' },
  // X-02: /compare was reachable only by typing the URL and /insights only from
  // a button on /stats. The palette is a primary way in, so they belong here.
  { name: 'Compare Teams', icon: GitCompareArrows, path: '/compare' },
  { name: 'League Insights', icon: Lightbulb, path: '/insights' },
];

/** Cmd/Ctrl+K command palette for jumping to pages and teams. */
const CommandPalette: React.FC<CommandPaletteProps> = ({ open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();
  const { data: teams } = useTeamsQuery();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Keyboard shortcut handler
  useEffect(() => {
    /** Toggle the palette on Cmd/Ctrl+K, suppressing the browser's default shortcut. */
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate, setOpen]
  );

  return (
    <>
      {/* Search trigger button */}
      {/* Icon-sized at every width. The 15rem expanded form this had from `xl`
          was built for the deleted pill bar, which gave it a whole flex column;
          the header row has about 96px of slack, so a 240px control overflowed
          it at every desktop width and the shell's `overflow-x-hidden` swallowed
          the evidence. The shortcut lives in the tooltip instead. */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn('relative size-9 p-0', 'text-muted-foreground')}
        title="Search (⌘K)"
      >
        <Search className="size-4" aria-hidden="true" />
        {/* The button is the icon alone, so without this it has no accessible
            name — the unnamed header button axe reports under X-01. */}
        <span className="sr-only">Search</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search teams, pages, or actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.path}
                value={action.name}
                onSelect={() => handleSelect(action.path)}
                className="cursor-pointer"
              >
                <action.icon className="mr-2 size-4" />
                <span>{action.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Teams */}
          {teams && teams.length > 0 && (
            <CommandGroup heading="Teams">
              {teams.slice(0, 10).map((team) => (
                <CommandItem
                  key={team.id}
                  value={`team ${team.name}`}
                  onSelect={() => handleSelect(`/teams/${toTeamSlug(team.name)}`)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 size-4" />
                  <span>{team.name}</span>
                  {team.divisionName && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {team.divisionName}
                    </span>
                  )}
                </CommandItem>
              ))}
              {teams.length > 10 && (
                <CommandItem
                  value="view all teams"
                  onSelect={() => handleSelect('/teams')}
                  className="cursor-pointer text-muted-foreground"
                >
                  <Users className="mr-2 size-4" />
                  <span>View all {teams.length} teams...</span>
                </CommandItem>
              )}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default CommandPalette;
