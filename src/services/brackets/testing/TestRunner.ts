
import { SeedTeam } from "../types";
import { BracketScenarioTester } from "./BracketScenarioTester";
import { BracketGenerator } from "../BracketGenerator";

/**
 * Test runner for bracket scenarios
 */
export class BracketTestRunner {
  /**
   * Run a test suite for bracket scenarios
   */
  static async runTestSuite() {
    console.log("🧪 Running bracket test suite...");
    
    // Generate test data
    const bracketId = "test-bracket-" + Date.now();
    const teams = this.generateTestTeams(8);
    
    // Generate a bracket
    const matches = BracketGenerator.generatePlayoffBracket(bracketId, teams);
    
    // Create tester
    const tester = new BracketScenarioTester(matches, teams);
    
    // Test scenario 1: Winners bracket champion wins GF1
    console.log("\n📋 SCENARIO 1: Winners bracket champion wins GF1");
    const scenario1Matches = tester.testWinnersBracketChampionWins();
    const scenario1State = tester.getBracketState(scenario1Matches);
    console.log("State:", scenario1State);
    console.log("Champion:", teams.find(t => t.id === scenario1State.championId)?.name);
    console.log("Bracket completion:", scenario1State.isComplete ? "✅ Complete" : "❌ Incomplete");
    
    // Test scenario 2: Losers bracket champion wins GF1, WB champ wins GF2
    console.log("\n📋 SCENARIO 2: Losers bracket champion wins GF1, WB champ wins GF2");
    const scenario2Matches = tester.testResetMatchWinnersBracketChampionWins();
    const scenario2State = tester.getBracketState(scenario2Matches);
    console.log("State:", scenario2State);
    console.log("Champion:", teams.find(t => t.id === scenario2State.championId)?.name);
    console.log("Bracket completion:", scenario2State.isComplete ? "✅ Complete" : "❌ Incomplete");
    
    // Test scenario 3: Losers bracket champion wins both finals
    console.log("\n📋 SCENARIO 3: Losers bracket champion wins both finals");
    const scenario3Matches = tester.testLosersBracketChampionWinsBoth();
    const scenario3State = tester.getBracketState(scenario3Matches);
    console.log("State:", scenario3State);
    console.log("Champion:", teams.find(t => t.id === scenario3State.championId)?.name);
    console.log("Bracket completion:", scenario3State.isComplete ? "✅ Complete" : "❌ Incomplete");
    
    console.log("\n✅ Test suite completed successfully");
  }
  
  /**
   * Generate test teams
   * @param count Number of teams to generate
   * @returns Array of seed teams
   */
  private static generateTestTeams(count: number): SeedTeam[] {
    const teams: SeedTeam[] = [];
    
    for (let i = 1; i <= count; i++) {
      teams.push({
        id: `team-${i}`,
        name: `Test Team ${i}`,
        seed: i
      });
    }
    
    return teams;
  }
}
