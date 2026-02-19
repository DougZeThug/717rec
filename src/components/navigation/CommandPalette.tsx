import {
  BarChart3,
  Calendar,
  Clock,
  Home,
  MessageSquare,
  Search,
  Settings,
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
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const navigate = useNavigate();
  const { data: teams } = useTeamsQuery();

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  // Keyboard shortcut handler
  useEffect(() => {
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
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          'relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2',
          'text-muted-foreground'
        )}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
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
                <action.icon className="mr-2 h-4 w-4" />
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
                  <User className="mr-2 h-4 w-4" />
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
                  <Users className="mr-2 h-4 w-4" />
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
