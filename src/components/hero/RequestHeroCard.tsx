import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  History,
  Loader2,
  Send,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useTeamsArray } from '@/hooks/teams';
import { useSubmitRequest, useTeamRequests } from '@/hooks/useTeamRequests';
import { cn } from '@/lib/utils';
import { HeroCard as HeroCardType } from '@/types/heroCard';
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, TeamRequestType } from '@/types/teamRequest';

import HeroCardBase from './HeroCardBase';

interface RequestHeroCardProps {
  card: HeroCardType;
}

const REQUEST_OPTIONS: { type: TeamRequestType; icon: React.ElementType; description: string }[] = [
  { type: 'TIME_CHANGE', icon: Clock, description: 'Request a different time slot' },
  { type: 'BYE_REQUEST', icon: Calendar, description: 'Request a bye week' },
  { type: 'EMERGENCY_CANCEL', icon: AlertTriangle, description: 'Emergency cancellation' },
];

const RequestHeroCard: React.FC<RequestHeroCardProps> = ({ card }) => {
  const { teams, isLoading: teamsLoading } = useTeamsArray({ includeHidden: false });
  const submitMutation = useSubmitRequest();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TeamRequestType | null>(null);
  const [teamSearchOpen, setTeamSearchOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form fields
  const [matchDate, setMatchDate] = useState('');
  const [currentTimeslot, setCurrentTimeslot] = useState('');
  const [requestedTimeslot, setRequestedTimeslot] = useState('');
  const [reason, setReason] = useState('');

  const { data: teamRequests, isLoading: requestsLoading } = useTeamRequests(
    selectedTeamId || undefined
  );

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);

  const resetForm = () => {
    setSelectedType(null);
    setMatchDate('');
    setCurrentTimeslot('');
    setRequestedTimeslot('');
    setReason('');
  };

  const handleSubmit = async () => {
    if (!selectedTeamId || !selectedType) return;

    await submitMutation.mutateAsync({
      team_id: selectedTeamId,
      request_type: selectedType,
      match_date: matchDate || undefined,
      current_timeslot: currentTimeslot || undefined,
      requested_timeslot: requestedTimeslot || undefined,
      reason: reason || undefined,
      submitted_by_name: selectedTeam?.name,
    });

    resetForm();
  };

  return (
    <HeroCardBase
      winterClassName="bg-gradient-to-br from-cyan-900/90 to-blue-900/90 text-cyan-50"
      defaultClassName={cn(card.background_color, card.text_color)}
      padded
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5" />
          <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wide">
            {card.title || 'Submit a Request'}
          </h3>
        </div>
        {selectedTeamId && teamRequests && teamRequests.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-inherit hover:bg-white/10"
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
        )}
      </div>

      {card.subtitle && <p className="text-sm opacity-80 mb-4">{card.subtitle}</p>}

      <div className="space-y-4">
        {/* Team selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium opacity-90">Select your team</Label>
          <Popover open={teamSearchOpen} onOpenChange={setTeamSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={teamSearchOpen}
                className={cn(
                  'w-full justify-between bg-background/20 border-white/20 hover:bg-background/30',
                  'text-inherit hover:text-inherit'
                )}
                disabled={teamsLoading}
              >
                {teamsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedTeam ? (
                  selectedTeam.name
                ) : (
                  'Choose a team...'
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
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
                          setSelectedTeamId(team.id);
                          setTeamSearchOpen(false);
                          resetForm();
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
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

        {/* Request type selection */}
        {selectedTeamId && !showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium opacity-90">What do you need?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {REQUEST_OPTIONS.map(({ type, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg transition-all text-center',
                    'border-2',
                    selectedType === type
                      ? 'bg-white/20 border-white/50'
                      : 'bg-background/10 border-white/20 hover:bg-background/20'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-semibold text-sm">{REQUEST_TYPE_LABELS[type]}</span>
                  <span className="text-xs opacity-70">{description}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Request details form */}
        <AnimatePresence>
          {selectedTeamId && selectedType && !showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Date field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium opacity-90">
                  {selectedType === 'BYE_REQUEST' ? 'Date to skip' : 'Match date'}
                </Label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="bg-background/20 border-white/20 text-inherit"
                />
              </div>

              {/* Time change specific fields */}
              {selectedType === 'TIME_CHANGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium opacity-90">Current timeslot</Label>
                    <Input
                      placeholder="e.g., 6:00 PM"
                      value={currentTimeslot}
                      onChange={(e) => setCurrentTimeslot(e.target.value)}
                      className="bg-background/20 border-white/20 text-inherit placeholder:text-inherit/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium opacity-90">Requested timeslot</Label>
                    <Input
                      placeholder="e.g., 7:00 PM"
                      value={requestedTimeslot}
                      onChange={(e) => setRequestedTimeslot(e.target.value)}
                      className="bg-background/20 border-white/20 text-inherit placeholder:text-inherit/50"
                    />
                  </div>
                </div>
              )}

              {/* Reason field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium opacity-90">
                  {selectedType === 'EMERGENCY_CANCEL' ? 'Reason (required)' : 'Reason (optional)'}
                </Label>
                <Textarea
                  placeholder="Explain your request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-background/20 border-white/20 text-inherit placeholder:text-inherit/50 min-h-[80px]"
                />
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={
                  submitMutation.isPending || (selectedType === 'EMERGENCY_CANCEL' && !reason)
                }
                className="w-full bg-white/20 hover:bg-white/30 text-inherit border border-white/20"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request history */}
        <AnimatePresence>
          {selectedTeamId && showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium opacity-90">Recent Requests</Label>
              {requestsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : teamRequests && teamRequests.length > 0 ? (
                <div className="space-y-2">
                  {teamRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/10 border border-white/10"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </span>
                          <Badge
                            variant={
                              request.status === 'APPROVED'
                                ? 'default'
                                : request.status === 'DENIED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {REQUEST_STATUS_LABELS[request.status]}
                          </Badge>
                        </div>
                        {request.match_date && (
                          <span className="text-xs opacity-70">
                            {format(new Date(request.match_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs opacity-50">
                        {format(new Date(request.created_at), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70 text-center py-4">No requests yet</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="w-full text-inherit hover:bg-white/10"
              >
                Back to form
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </HeroCardBase>
  );
};

export default React.memo(RequestHeroCard);
