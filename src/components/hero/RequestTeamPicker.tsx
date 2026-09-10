import { Check, ChevronDown, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Team } from '@/types';

interface RequestTeamPickerProps {
  teams: Team[] | undefined;
  isLoading: boolean;
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
}

/** What the button says before, during and after the teams arrive. */
const TriggerLabel: React.FC<{ isLoading: boolean; selectedTeam: Team | undefined }> = ({
  isLoading,
  selectedTeam,
}) => {
  if (isLoading) return <Loader2 className="size-4 animate-spin" />;
  return <>{selectedTeam?.name ?? 'Choose a team...'}</>;
};

/** Which team the request is for: a searchable list, because there are many. */
const RequestTeamPicker: React.FC<RequestTeamPickerProps> = ({
  teams,
  isLoading,
  selectedTeamId,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = React.useId();
  const selectedTeam = teams?.find((team) => team.id === selectedTeamId);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium opacity-90">Select your team</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            className={cn(
              'w-full justify-between bg-background/20 border-white/20 hover:bg-background/30',
              'text-inherit hover:text-inherit'
            )}
            disabled={isLoading}
          >
            <TriggerLabel isLoading={isLoading} selectedTeam={selectedTeam} />
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent id={listboxId} className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search teams..." />
            <CommandList>
              <CommandEmpty>No team found.</CommandEmpty>
              <CommandGroup>
                {teams?.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={team.name}
                    onSelect={() => {
                      onSelect(team.id);
                      setIsOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        selectedTeamId === team.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {team.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default RequestTeamPicker;
