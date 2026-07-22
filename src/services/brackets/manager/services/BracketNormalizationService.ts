import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import { GrandFinalNormalizationService } from './normalization/GrandFinalNormalizationService';
import { LbStructureService } from './normalization/LbStructureService';
import { LosersRoundNormalizationService } from './normalization/LosersRoundNormalizationService';
import { MatchPropagationRepairService } from './normalization/MatchPropagationRepairService';

/**
 * Facade for the bracket repair passes.
 *
 * These previously ran automatically (with retries and swallowed errors) on
 * every score save; they are now invoked ONLY by the explicit admin
 * Repair Bracket action (BracketRepairService), run once, and throw loudly
 * on database failures.
 *
 * Key invariant: `propagateCompletedMatches()` repairs missing winner
 * advancement WITHOUT rewriting completed source match results.
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

  /** Ensures the grand final is populated from the WB and LB finalists. */
  normalizeGrandFinalPopulation(stageId: number): Promise<void> {
    return this.grandFinalNormalizationService.normalizeGrandFinalPopulation(stageId);
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
