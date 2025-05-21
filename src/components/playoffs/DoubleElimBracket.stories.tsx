
import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import DoubleElimBracket from "./DoubleElimBracket";
import { PlayoffBracket } from "@/types";
import { BRACKET_FORMATS, BRACKET_STATES } from "@/constants/brackets";

const meta: Meta<typeof DoubleElimBracket> = {
  title: "Playoffs/DoubleElimBracket",
  component: DoubleElimBracket,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof DoubleElimBracket>;

// Mock data for the bracket
const mockBracket: PlayoffBracket = {
  id: "bracket-1",
  name: "Double Elimination Bracket",
  format: BRACKET_FORMATS.DOUBLE,
  division: "Recreational",
  state: BRACKET_STATES.IN_PROGRESS,
  matches: [
    {
      id: "match-1",
      round: 1,
      position: 1,
      team1Id: "team-1",
      team2Id: "team-2",
      winnerId: "team-1",
      loserId: "team-2",
      team1Score: 1,
      team2Score: 0,
      matchType: "winners",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
    {
      id: "match-2",
      round: 1,
      position: 2,
      team1Id: "team-3",
      team2Id: "team-4",
      winnerId: "team-3",
      loserId: "team-4",
      team1Score: 1,
      team2Score: 0,
      matchType: "winners",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
    {
      id: "match-3",
      round: 2,
      position: 1,
      team1Id: "team-1",
      team2Id: "team-3",
      winnerId: "team-1",
      loserId: "team-3",
      team1Score: 1,
      team2Score: 0,
      matchType: "winners",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
    {
      id: "match-4",
      round: 1,
      position: 1,
      team1Id: "team-2",
      team2Id: "team-4",
      winnerId: "team-2",
      loserId: "team-4",
      team1Score: 1,
      team2Score: 0,
      matchType: "losers",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
    {
      id: "match-5",
      round: 2,
      position: 1,
      team1Id: "team-2",
      team2Id: "team-3",
      winnerId: "team-2",
      loserId: "team-3",
      team1Score: 1,
      team2Score: 0,
      matchType: "losers",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
    {
      id: "match-6",
      round: 1,
      position: 1,
      team1Id: "team-1",
      team2Id: "team-2",
      winnerId: "team-1",
      loserId: "team-2",
      team1Score: 1,
      team2Score: 0,
      matchType: "finals",
      bestOf: 3,
      bracket_id: "bracket-1",
    },
  ],
};

// Mock teams data
const mockTeams = [
  { id: "team-1", name: "Team Alpha" },
  { id: "team-2", name: "Team Beta" },
  { id: "team-3", name: "Team Gamma" },
  { id: "team-4", name: "Team Delta" },
];

export const Default: Story = {
  args: {
    bracket: mockBracket,
    teams: mockTeams,
  },
};

export const Loading: Story = {
  args: {
    bracket: undefined,
    teams: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    bracket: {
      ...mockBracket,
      matches: [],
    },
    teams: mockTeams,
  },
};
