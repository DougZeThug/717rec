
import { Team } from "@/types";
import { SeedTeam } from "../types";

/**
 * Handles team preparation and seeding for brackets
 */
export class TeamSeeding {
  /**
   * Sort and seed teams based on their seed property
   * @param teams Array of teams to prepare
   * @returns Array of seeded teams
   */
  static prepareTeams(teams: Team[]): SeedTeam[] {
    // Make a copy of teams to avoid mutating the original
    const seedTeams: SeedTeam[] = teams.map((team, index) => ({
      id: team.id,
      name: team.name,
      seed: team.seed || index + 1, // Use existing seed or assign based on index
      imageUrl: team.imageUrl,
      logoUrl: team.logoUrl,
    }));
    
    // Sort by seed value
    return seedTeams.sort((a, b) => a.seed - b.seed);
  }

  /**
   * Creates optimal tournament seeding to avoid top seeds meeting early
   * @param totalTeams Number of teams in the bracket
   * @returns Array of seed positions
   */
  static createOptimalSeeding(totalTeams: number): number[] {
    // Implementation for optimal seeding (1 vs 16, 8 vs 9, etc.)
    // This is a placeholder for future implementation
    return Array.from({ length: totalTeams }, (_, i) => i + 1);
  }
}
