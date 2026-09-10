import { AnimatePresence, m } from 'framer-motion';
import { History, Loader2, Send } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeamsArray } from '@/hooks/teams';
import { useSubmitRequest, useTeamRequests } from '@/hooks/useTeamRequests';
import { cn } from '@/lib/utils';
import { HeroCard as HeroCardType } from '@/types/heroCard';
import { TeamRequestType } from '@/types/teamRequest';

import HeroCardBase from './HeroCardBase';
import {
  buildRequestPayload,
  DATE_FIELD_LABEL,
  isRequestIncomplete,
  REASON_FIELD_LABEL,
} from './requestForm';
import RequestHistoryList from './RequestHistoryList';
import RequestTeamPicker from './RequestTeamPicker';
import RequestTimeslotFields from './RequestTimeslotFields';
import RequestTypePicker from './RequestTypePicker';

interface RequestHeroCardProps {
  card: HeroCardType;
}

const RequestHeroCard: React.FC<RequestHeroCardProps> = ({ card }) => {
  const { teams, isLoading: teamsLoading } = useTeamsArray({ includeHidden: false });
  const submitMutation = useSubmitRequest();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TeamRequestType | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form fields
  const [matchDate, setMatchDate] = useState('');
  const [currentTimeslot, setCurrentTimeslot] = useState('');
  const [requestedTimeslot, setRequestedTimeslot] = useState('');
  const [reason, setReason] = useState('');

  const { data: teamRequests, isLoading: requestsLoading } = useTeamRequests(
    selectedTeamId || undefined
  );

  const selectedTeam = teams?.find((team) => team.id === selectedTeamId);

  const resetForm = () => {
    setSelectedType(null);
    setMatchDate('');
    setCurrentTimeslot('');
    setRequestedTimeslot('');
    setReason('');
  };

  const values = {
    teamId: selectedTeamId,
    type: selectedType,
    matchDate,
    currentTimeslot,
    requestedTimeslot,
    reason,
  };

  const handleSubmit = async () => {
    const payload = buildRequestPayload(values, selectedTeam?.name);
    if (!payload) return;

    await submitMutation.mutateAsync(payload);
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
          <Send className="size-5" />
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
            <History className="size-4 mr-1" />
            History
          </Button>
        )}
      </div>

      {card.subtitle && <p className="text-sm opacity-80 mb-4">{card.subtitle}</p>}

      <div className="space-y-4">
        <RequestTeamPicker
          teams={teams}
          isLoading={teamsLoading}
          selectedTeamId={selectedTeamId}
          onSelect={(teamId) => {
            setSelectedTeamId(teamId);
            resetForm();
          }}
        />

        {selectedTeamId && !showHistory && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <RequestTypePicker selectedType={selectedType} onSelect={setSelectedType} />
          </m.div>
        )}

        {/* Request details form */}
        <AnimatePresence>
          {selectedTeamId && selectedType && !showHistory && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Date field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium opacity-90">
                  {DATE_FIELD_LABEL[selectedType]}
                </Label>
                <Input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="bg-background/20 border-white/20 text-inherit"
                />
              </div>

              {selectedType === 'TIME_CHANGE' && (
                <RequestTimeslotFields
                  currentTimeslot={currentTimeslot}
                  onCurrentTimeslotChange={setCurrentTimeslot}
                  requestedTimeslot={requestedTimeslot}
                  onRequestedTimeslotChange={setRequestedTimeslot}
                />
              )}

              {/* Reason field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium opacity-90">
                  {REASON_FIELD_LABEL[selectedType]}
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
                disabled={submitMutation.isPending || isRequestIncomplete(values)}
                className="w-full bg-white/20 hover:bg-white/30 text-inherit border border-white/20"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Submit Request
              </Button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Request history */}
        <AnimatePresence>
          {selectedTeamId && showHistory && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <RequestHistoryList
                requests={teamRequests}
                isLoading={requestsLoading}
                onBack={() => setShowHistory(false)}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </HeroCardBase>
  );
};

export default React.memo(RequestHeroCard);
