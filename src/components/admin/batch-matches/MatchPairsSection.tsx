import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import React from 'react';

import { Switch } from '@/components/ui/switch';
import { Team } from '@/types';

import MatchPairsList, { MatchPair } from './MatchPairsList';

interface MatchPairsSectionProps {
  matchPairs: MatchPair[];
  teams: Team[];
  updateMatchPair: (id: string, updates: Partial<MatchPair>) => void;
  removeMatchPair: (id: string) => void;
  showAutoSchedule: boolean;
  setShowAutoSchedule: (show: boolean) => void;
}

export const MatchPairsSection: React.FC<MatchPairsSectionProps> = ({
  matchPairs,
  teams,
  updateMatchPair,
  removeMatchPair,
  showAutoSchedule,
  setShowAutoSchedule,
}) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Match Pairings</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Auto Schedule</span>
          <Switch checked={showAutoSchedule} onCheckedChange={setShowAutoSchedule} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        Create team vs team pairings and assign timeslots
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <MatchPairsList
          pairs={matchPairs}
          teams={teams}
          onUpdate={updateMatchPair}
          onRemove={removeMatchPair}
        />
      </motion.div>
    </>
  );
};
