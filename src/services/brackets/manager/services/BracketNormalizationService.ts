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

  calculateLBRounds(bracketSize: number): number {
    return this.lbStructureService.calculateLBRounds(bracketSize);
  }

  findLBFinalMatch(stageId: number): Promise<StorageMatch | null> {
    return this.grandFinalNormalizationService.findLBFinalMatch(stageId);
  }

  normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    return this.grandFinalNormalizationService.normalizeGrandFinalPopulation(stageId);
  }

  repairGrandFinalWithRetries(
    stageId: number,
    opts?: { attempts?: number; delayMs?: number }
  ): Promise<void> {
    return this.grandFinalNormalizationService.repairGrandFinalWithRetries(stageId, opts);
  }

  isWbFinalRound(roundId: number, stageId: number): Promise<boolean> {
    return this.lbStructureService.isWbFinalRound(roundId, stageId);
  }

  isLbFinalRound(roundId: number, stageId: number): Promise<boolean> {
    return this.lbStructureService.isLbFinalRound(roundId, stageId);
  }

  normalizeLosersR1(stageId: number): Promise<void> {
    return this.losersRoundNormalizationService.normalizeLosersR1(stageId);
  }

  propagateCompletedMatches(stageId: number): Promise<void> {
    return this.matchPropagationRepairService.propagateCompletedMatches(stageId);
  }
}
