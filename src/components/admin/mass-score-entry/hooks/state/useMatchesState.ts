import { useState } from 'react';

import { MatchWithTeams } from '../../types';

export const useMatchesState = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  // Stores the original fetched state of matches so we can detect
  // if a match was already completed and reverse old stats before applying new ones
  const [originalMatches, setOriginalMatches] = useState<Map<string, MatchWithTeams>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Wrapper that also captures the original state snapshot
  const setMatchesWithSnapshot = (
    matchesOrUpdater: MatchWithTeams[] | ((prev: MatchWithTeams[]) => MatchWithTeams[])
  ) => {
    if (typeof matchesOrUpdater === 'function') {
      setMatches(matchesOrUpdater);
    } else {
      // When setting fresh fetched data, also snapshot the originals
      const snapshot = new Map<string, MatchWithTeams>();
      matchesOrUpdater.forEach((m) => snapshot.set(m.id, { ...m }));
      setOriginalMatches(snapshot);
      setMatches(matchesOrUpdater);
    }
  };

  return {
    matches,
    setMatches: setMatchesWithSnapshot,
    originalMatches,
    setOriginalMatches,
    loading,
    setLoading,
    submitting,
    setSubmitting,
  };
};
