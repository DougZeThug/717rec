import { m } from 'framer-motion';
import { Check, Loader2, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ParticipationStatus,
  useConfirmationSeason,
  useSubmitParticipation,
  useTeamParticipation,
} from '@/hooks/useSeasonParticipation';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { cn } from '@/lib/utils';
import { formatWithPattern } from '@/utils/formatDateSafe';

import HeroCardBase from './HeroCardBase';

const ParticipationHeroCard: React.FC = () => {
  const { data: season, isLoading: seasonLoading } = useConfirmationSeason();

  // The card used to list every team, hidden ones included, to anyone at all —
  // signed out included. A person can only answer for their own team, so it now
  // reads the caller's approved membership and answers for that team only.
  const { membership, isFetching: membershipLoading } = useTeamMembership();
  const ownTeam = membership?.is_approved ? membership.team : undefined;

  const [selectedStatus, setSelectedStatus] = useState<ParticipationStatus | ''>('');
  const [isEditing, setIsEditing] = useState(true);

  const { data: existingParticipation, isLoading: participationLoading } = useTeamParticipation(
    season?.id,
    ownTeam?.id
  );

  const submitMutation = useSubmitParticipation();

  // Load existing participation when team is selected
  useEffect(() => {
    if (existingParticipation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setSelectedStatus(existingParticipation.status);
      setIsEditing(false);
    } else {
      setSelectedStatus('');
      setIsEditing(true);
    }
  }, [existingParticipation]);

  // Nothing to show while either read is in flight, when no season is open for
  // confirmation, or when the caller has no approved team to answer for. A
  // signed-out visitor has no membership, so this also hides the card from them.
  if (seasonLoading || membershipLoading) {
    return null;
  }

  if (!season || !ownTeam) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedStatus) return;

    await submitMutation.mutateAsync({
      seasonId: season.id,
      teamId: ownTeam.id,
      status: selectedStatus,
      submittedByName: ownTeam.name,
    });

    setIsEditing(false);
  };

  return (
    <HeroCardBase
      winterClassName="bg-gradient-to-br from-cyan-900/90 to-blue-900/90 text-cyan-50"
      defaultClassName="bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground border-t-[3px] border-t-primary"
      padded
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Users className="size-5" />
        <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wide">
          Confirm your team for {season.name}
        </h3>
      </div>

      {/* Form content */}
      <div className="space-y-4">
        {/* The team is the caller's own; there is nothing to choose. */}
        <div className="space-y-2">
          <Label className="text-sm font-medium opacity-90">Your team</Label>
          <p className="rounded-md border border-white/20 bg-background/20 px-3 py-2 font-semibold">
            {ownTeam.name}
          </p>
        </div>

        {isEditing && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <Label className="text-sm font-medium opacity-90">Will your team be playing?</Label>
            <RadioGroup
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as ParticipationStatus)}
              className="flex gap-3"
            >
              <Label
                htmlFor="playing"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer transition-all',
                  'border-2',
                  selectedStatus === 'PLAYING'
                    ? 'bg-green-500/30 border-green-400'
                    : 'bg-background/10 border-white/20 hover:bg-background/20'
                )}
              >
                <RadioGroupItem value="PLAYING" id="playing" className="sr-only" />
                <Check className="size-5" />
                <span className="font-semibold">Playing</span>
              </Label>
              <Label
                htmlFor="not-playing"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer transition-all',
                  'border-2',
                  selectedStatus === 'NOT_PLAYING'
                    ? 'bg-red-500/30 border-red-400'
                    : 'bg-background/10 border-white/20 hover:bg-background/20'
                )}
              >
                <RadioGroupItem value="NOT_PLAYING" id="not-playing" className="sr-only" />
                <X className="size-5" />
                <span className="font-semibold">Not Playing</span>
              </Label>
            </RadioGroup>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatus || submitMutation.isPending}
              className="w-full bg-white/20 hover:bg-white/30 text-inherit border border-white/20"
            >
              {submitMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </m.div>
        )}

        {/* Saved status display */}
        {!isEditing && existingParticipation && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div
              className={cn(
                'flex items-center justify-between p-4 rounded-lg',
                existingParticipation.status === 'PLAYING'
                  ? 'bg-green-500/20 border border-green-400/30'
                  : 'bg-red-500/20 border border-red-400/30'
              )}
            >
              <div className="flex items-center gap-2">
                {existingParticipation.status === 'PLAYING' ? (
                  <Check className="size-5 text-green-400" />
                ) : (
                  <X className="size-5 text-red-400" />
                )}
                <span className="font-semibold">
                  {existingParticipation.status === 'PLAYING' ? 'Playing' : 'Not Playing'}
                </span>
              </div>
              <span className="text-sm opacity-70">
                Saved {formatWithPattern(existingParticipation.updated_at, 'MMM d, h:mm a')}
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="text-sm opacity-80 hover:opacity-100"
            >
              Change response
            </Button>
          </m.div>
        )}

        {/* Loading state for participation */}
        {participationLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>
    </HeroCardBase>
  );
};

export default ParticipationHeroCard;
