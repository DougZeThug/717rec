
import type { Meta, StoryObj } from "@storybook/react";
import DoubleElimBracket from "./DoubleElimBracket";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";

const meta: Meta<typeof DoubleElimBracket> = {
  title: "Playoffs/DoubleElimBracket",
  component: DoubleElimBracket,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof DoubleElimBracket>;

// Sample data for our double elimination bracket
const mockTeams: Team[] = [
  { id: "team1", name: "Alpha Team", seed: 1 },
  { id: "team2", name: "Beta Squad", seed: 2 },
  { id: "team3", name: "Gamma Force", seed: 3 },
  { id: "team4", name: "Delta Crew", seed: 4 },
  { id: "team5", name: "Epsilon Five", seed: 5 },
  { id: "team6", name: "Zeta Six", seed: 6 },
  { id: "team7", name: "Eta Seven", seed: 7 },
  { id: "team8", name: "Theta Eight", seed: 8 },
];

// Create base match template
const createMatch = (
  id: string,
  round: number,
  position: number,
  matchType: string,
  team1Id?: string,
  team2Id?: string,
  nextWinMatchId?: string, 
  nextLoseMatchId?: string,
  winnerId?: string,
  team1GameWins?: number,
  team2GameWins?: number
): PlayoffMatch => ({
  id,
  round,
  position,
  matchType,
  team1Id,
  team2Id,
  team1Score: team1GameWins ? team1GameWins * 10 : 0,
  team2Score: team2GameWins ? team2GameWins * 10 : 0,
  team1GameWins,
  team2GameWins,
  team1Seed: mockTeams.find(t => t.id === team1Id)?.seed,
  team2Seed: mockTeams.find(t => t.id === team2Id)?.seed,
  winnerId,
  loserId: winnerId ? (winnerId === team1Id ? team2Id : team1Id) : undefined,
  nextWinMatchId,
  nextLoseMatchId,
  bestOf: 3,
  bracket_id: "bracket1",
  status: winnerId ? "completed" : "pending"
});

// Winners bracket matches
const winnersRound1: PlayoffMatch[] = [
  createMatch("w1", 1, 1, "winners", "team1", "team8", "w5", "l1"),
  createMatch("w2", 1, 2, "winners", "team4", "team5", "w5", "l2"),
  createMatch("w3", 1, 3, "winners", "team3", "team6", "w6", "l3"),
  createMatch("w4", 1, 4, "winners", "team2", "team7", "w6", "l4"),
];

const winnersRound2: PlayoffMatch[] = [
  createMatch("w5", 2, 1, "winners", "team1", "team4", "w7", "l5", "team1", 2, 0),
  createMatch("w6", 2, 2, "winners", "team3", "team2", "w7", "l6", "team2", 0, 2),
];

const winnersRound3: PlayoffMatch[] = [
  createMatch("w7", 3, 1, "winners", "team1", "team2", "f1", "l7", "team1", 2, 1),
];

// Losers bracket matches
const losersRound1: PlayoffMatch[] = [
  createMatch("l1", 1, 1, "losers", "team8", "team5", "l5"),
  createMatch("l2", 1, 2, "losers", "team4", "team6", "l5"),
  createMatch("l3", 1, 3, "losers", "team3", "team7", "l6"),
];

const losersRound2: PlayoffMatch[] = [
  createMatch("l5", 2, 1, "losers", "team5", "team6", "l7"),
  createMatch("l6", 2, 2, "losers", "team7", "team2", "l7", undefined, "team2", 2, 0),
];

const losersRound3: PlayoffMatch[] = [
  createMatch("l7", 3, 1, "losers", "team6", "team2", "l8", undefined, "team2", 0, 2),
];

const losersRound4: PlayoffMatch[] = [
  createMatch("l8", 4, 1, "losers", "team2", undefined, "f1")
];

// Finals matches
const finalsMatches: PlayoffMatch[] = [
  createMatch("f1", 1, 1, "finals", "team1", "team2", undefined, undefined, "team1", 2, 0),
];

// Double elimination bracket
const mockBracket: PlayoffBracket = {
  id: "bracket1",
  format: "Double Elimination",
  title: "Tournament X",
  matches: [
    ...winnersRound1,
    ...winnersRound2,
    ...winnersRound3,
    ...losersRound1,
    ...losersRound2,
    ...losersRound3,
    ...losersRound4,
    ...finalsMatches
  ],
  division_id: "div1",
  challonge_tournament_id: null,
  challonge_tournament_url: null
};

export const Default: Story = {
  args: {
    bracket: mockBracket,
    teams: mockTeams,
    winners: [winnersRound1, winnersRound2, winnersRound3],
    losers: [losersRound1, losersRound2, losersRound3, losersRound4],
    finals: finalsMatches,
    onEditMatch: (matchId: string) => console.log("Edit match", matchId),
  },
};

export const WithChampion: Story = {
  args: {
    bracket: {
      ...mockBracket,
      matches: mockBracket.matches.map(m => 
        m.id === "f1" ? { ...m, winnerId: "team1", loserId: "team2", status: "completed" } : m
      )
    },
    teams: mockTeams,
    winners: [winnersRound1, winnersRound2, winnersRound3],
    losers: [losersRound1, losersRound2, losersRound3, losersRound4],
    finals: [{
      ...finalsMatches[0],
      winnerId: "team1", 
      loserId: "team2", 
      status: "completed",
      team1GameWins: 2,
      team2GameWins: 0
    }],
    onEditMatch: (matchId: string) => console.log("Edit match", matchId),
  },
};
