
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DoubleElimBracket from "../DoubleElimBracket";
import { PlayoffBracket } from "@/types";
import { BRACKET_FORMATS } from "@/constants/brackets";

// Mock the hooks used in the component
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" })
}));

vi.mock("../bracket/hooks/useChampionDisplay", () => ({
  useChampionDisplay: () => ({ championDisplay: null })
}));

vi.mock("../bracket/hooks/useBracketConnectors", () => ({
  useBracketConnectors: () => ({
    winnersConnectorPaths: [],
    losersConnectorPaths: [],
    crossConnectorPaths: [],
    finalsConnectorPaths: []
  })
}));

describe("DoubleElimBracket Empty Rendering", () => {
  test("should render safely with empty arrays without crashing", () => {
    // Mock bracket data
    const emptyBracket: PlayoffBracket = {
      id: "test-bracket-123",
      name: "Test Empty Bracket",
      format: BRACKET_FORMATS.DOUBLE,
      division: "Test Division",
      matches: [],
      state: "pending"
    };

    // Render with empty arrays for winners, losers, and finals
    const { container } = render(
      <DoubleElimBracket
        winners={[]}
        losers={[]}
        finals={[]}
        bracket={emptyBracket}
        teams={[]}
        onEditMatch={() => {}}
      />
    );

    // Check that component rendered without crashing
    expect(container).toBeDefined();
    
    // Check that no RoundColumn components were rendered
    const roundColumns = container.querySelectorAll("[data-testid^='round-column']");
    expect(roundColumns.length).toBe(0);
  });

  test("should render only the sections with matches", () => {
    // Mock bracket data
    const bracketWithSomeMatches: PlayoffBracket = {
      id: "test-bracket-123",
      name: "Test Partial Bracket",
      format: BRACKET_FORMATS.DOUBLE,
      division: "Test Division",
      matches: [],
      state: "pending"
    };

    // Create some mock matches for one section only (winners)
    const mockWinnersMatches = [
      [
        {
          id: "match-1",
          round: 1,
          position: 1,
          matchType: "winners" as const,
          team1Id: "team-1",
          team2Id: "team-2",
          bracket_id: "test-bracket-123",
          winnerId: null,
          loserId: null,
          team1Score: null,
          team2Score: null,
          bestOf: 3,
          team1Seed: 1,
          team2Seed: 2,
          nextWinMatchId: null,
          nextLoseMatchId: null
        }
      ]
    ];

    // Render with one section having matches, others empty
    const { container } = render(
      <DoubleElimBracket
        winners={mockWinnersMatches}
        losers={[]}
        finals={[]}
        bracket={bracketWithSomeMatches}
        teams={[]}
        onEditMatch={() => {}}
      />
    );

    // Check that component rendered without crashing
    expect(container).toBeDefined();
    
    // We should see the winners bracket title but not the losers or finals
    expect(screen.getByText("Winners Bracket")).toBeInTheDocument();
    expect(screen.queryByText("Losers Bracket")).not.toBeInTheDocument();
    expect(screen.queryByText("Finals")).not.toBeInTheDocument();
  });
});
