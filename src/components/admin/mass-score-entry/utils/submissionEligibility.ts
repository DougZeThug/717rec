import { MatchWithTeams } from '../types';

export const getRealMatchId = (matchId: string) => matchId.split('-index-')[0];

export const isSubmittableMatch = (match: MatchWithTeams) =>
  Boolean(match.isEdited && match.isValid && match.iscompleted);

export const getUnsubmittableHint = (match: MatchWithTeams): string | null => {
  if (!match.isEdited || isSubmittableMatch(match)) return null;
  if (!match.isValid) return 'Invalid — fix scores before submitting.';
  if (!match.iscompleted) {
    return "Marked incomplete — won't submit here. Use Live Corrections to reopen completed matches.";
  }
  return null;
};

export const getMatchDisplayName = (match: MatchWithTeams) =>
  `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}`;
