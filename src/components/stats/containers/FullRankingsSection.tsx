import React from 'react';

import { Ranking } from '@/types';

import FullRankings from '../FullRankings';

interface FullRankingsSectionProps {
  rankings: Ranking[];
  myTeamId?: string | null;
}

const FullRankingsSection = ({ rankings, myTeamId }: FullRankingsSectionProps) => {
  return <FullRankings rankings={rankings} myTeamId={myTeamId} />;
};

export default FullRankingsSection;
