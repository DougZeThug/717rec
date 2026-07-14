import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageMatch } from '../types/BracketServiceTypes';
import { GrandFinalNormalizationService } from './normalization/GrandFinalNormalizationService';
import { LbStructureService } from './normalization/LbStructureService';
import { LosersRoundNormalizationService } from './normalization/LosersRoundNormalizationService';
import { MatchPropagationRepairService } from './normalization/MatchPropagationRepairService';

/**
 * Facade/orchestrator for bracket normalization tasks.
 *
 * Keeps the public API stable while delegating behavior into focused services:
 * - LbStructureService
 * - GrandFinalNormalizationService
 * - LosersRoundNormalizationService
 * - MatchPropagationRepairService
 *
 * Key invariant: `propagateCompletedMatches()` repairs missing winner advancement
 * WITHOUT rewriting completed source match results (score/result fields preserved).
 */
export class BracketNormalizationService {
  private readonly lbStructureService: LbStructureService;
  private readonly grandFinalNormalizationService: GrandFinalNormalizationService;
  private readonly losersRoundNormalizationService: LosersRoundNormalizationService;
  private readonly matchPropagationRepairService: MatchPropagationRepairService;

  constructor(private storage: SupabaseSqlStorage) {
    this.lbStructureService = new LbStructureService(storage);
    this.grandFinalNormalizationService = new GrandFinalNormalizationService(
      storage,
      this.lbStructureService
    );
    this.losersRoundNormalizationService = new LosersRoundNormalizationService(
      storage,
      this.lbStructureService
    );
    this.matchPropagationRepairService = new MatchPropagationRepairService(
      storage,
      this.lbStructureService
    );
  }

  /** Returns the number of losers-bracket rounds for a given bracket size. */
  calculateLBRounds(bracketSize: number): number {
    return this.lbStructureService.calculateLBRounds(bracketSize);
  }

  /** Returns the losers-bracket final match for a stage, or null when absent. */
  findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    return this.grandFinalNormalizationService.findLBFinalMatch(stageId);
  }

  /** Ensures the grand final is populated from the WB and LB finalists. */
  normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    return this.grandFinalNormalizationService.normalizeGrandFinalPopulation(stageId);
  }

  /** Retries grand-final normalization with configurable attempts and delay. */
  repairGrandFinalWithRetries(
    stageId: number,
    opts?: { attempts?: number; delayMs?: number }
  ): Promise<void> {
    return this.grandFinalNormalizationService.repairGrandFinalWithRetries(stageId, opts);
  }

  /** Checks whether the given round is the winners-bracket final for a stage. */
  isWbFinalRound(roundId: number, stageId: number): Promise<boolean> {
    return this.lbStructureService.isWbFinalRound(roundId, stageId);
  }

  /** Checks whether the given round is the losers-bracket final for a stage. */
  isLbFinalRound(roundId: number, stageId: number): Promise<boolean> {
    return this.lbStructureService.isLbFinalRound(roundId, stageId);
  }

  /** Normalizes losers-bracket round 1 seeding and population. */
  normalizeLosersR1(stageId: number): Promise<void> {
    return this.losersRoundNormalizationService.normalizeLosersR1(stageId);
  }

  /** Repairs missing winner advancement without rewriting completed source match results. */
  propagateCompletedMatches(stageId: number): Promise<void> {
    return this.matchPropagationRepairService.propagateCompletedMatches(stageId);
  }
}
