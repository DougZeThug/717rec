import type {
  BracketManagerMatchWithStage,
  LegacyPlayoffMatchWithGames,
} from '@/services/brackets/read/types';
import type { TeamStreakRpcResult } from '@/types/badges';
import type {
  BulkTeamSeedUpdateResult,
  BulkTeamSeedUpdateRpcResponse,
  TeamSeedUpdateInput,
  TeamSeedUpdateResult,
} from '@/types/seeding';

/**
 * Phase 3 prerequisite alignment types.
 *
 * This module re-exports existing domain contracts used by business-critical
 * flows so upcoming Phase 3 hardening work can import from one stable place.
 * Runtime behavior is unchanged.
 */

export type Phase3LegacyPlayoffMatchWithGames = LegacyPlayoffMatchWithGames;
export type Phase3BracketManagerMatchWithStage = BracketManagerMatchWithStage;

export type Phase3TeamSeedUpdateInput = TeamSeedUpdateInput;
export type Phase3TeamSeedUpdateResult = TeamSeedUpdateResult;
export type Phase3BulkTeamSeedUpdateResult = BulkTeamSeedUpdateResult;
export type Phase3BulkTeamSeedUpdateRpcResponse = BulkTeamSeedUpdateRpcResponse;

export type Phase3TeamStreakRpcResult = TeamStreakRpcResult;
