import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageParticipant } from '../../types/BracketServiceTypes';

export type BracketAdminDeps = {
  storage: SupabaseSqlStorage;
};

export type EditMatchParticipantsResult = {
  matchId: number;
  opponent1_id: number | null;
  opponent2_id: number | null;
  message: string;
};

export type ToggleByeReadyResult = {
  matchId: number;
  status: number;
  statusName: string;
  message: string;
};

export type ByeEligibilityResult = {
  ok: boolean;
  reason?: string;
  meta?: {
    isLosers: boolean;
    exactlyOneReal: boolean;
    isByeSide: boolean;
    status: number;
    currentStatusName: string;
    opponent1Name: string | null;
    opponent2Name: string | null;
  };
};

export type ResolveTeamToParticipantIdFn = (
  teamId: string | null,
  tournamentId: string,
  participants: StorageParticipant[]
) => Promise<number | null>;
