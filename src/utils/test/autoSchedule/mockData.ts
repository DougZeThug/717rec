
import { Team } from "@/types";
import { TeamPairing, TimeBlockTeamsMap } from "@/types/autoSchedule";

// Mock teams for testing
export const mockTeams: Team[] = [
  {
    id: "team1",
    name: "Tigers",
    logoUrl: "/logos/tigers.png",
    wins: 5,
    losses: 2,
    game_wins: 15,
    game_losses: 6,
    sos: 0.6,
    power_score: 75,
    division: "division1",
    divisionName: "Division A"
  },
  {
    id: "team2",
    name: "Lions",
    logoUrl: "/logos/lions.png",
    wins: 6,
    losses: 1,
    game_wins: 18,
    game_losses: 3,
    sos: 0.7,
    power_score: 85,
    division: "division1",
    divisionName: "Division A"
  },
  {
    id: "team3",
    name: "Eagles",
    logoUrl: "/logos/eagles.png",
    wins: 4,
    losses: 3,
    game_wins: 12,
    game_losses: 9,
    sos: 0.55,
    power_score: 65,
    division: "division1",
    divisionName: "Division A"
  },
  {
    id: "team4",
    name: "Bears",
    logoUrl: "/logos/bears.png",
    wins: 2,
    losses: 5,
    game_wins: 6,
    game_losses: 15,
    sos: 0.5,
    power_score: 45,
    division: "division2",
    divisionName: "Division B"
  }
];

// Mock time block teams for testing
export const mockTimeBlockTeams: TimeBlockTeamsMap = {
  "6:30": [mockTeams[0], mockTeams[1]],
  "7:30": [mockTeams[2], mockTeams[3]],
  "8:30": []
};

// Mock team pairings for testing
export const mockPairings: Record<string, TeamPairing[]> = {
  "6:30": [
    {
      team1: mockTeams[0],
      team2: mockTeams[1],
      compatibilityScore: 8.5,
      hasPlayedBefore: false
    }
  ],
  "7:30": [
    {
      team1: mockTeams[2],
      team2: mockTeams[3],
      compatibilityScore: 7.2,
      hasPlayedBefore: true
    }
  ],
  "8:30": []
};

// Mock date for testing
export const mockDate = new Date("2023-06-15");
