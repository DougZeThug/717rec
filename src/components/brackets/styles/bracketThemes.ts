
import { BracketTheme } from "../types/bracketTypes";

export const challongeTheme: BracketTheme = {
  name: "Challonge Dark",
  colors: {
    background: "#2a2a2a",
    winners: "#60a5fa",
    losers: "#fb923c", 
    finals: "#fbbf24",
    completed: "#10b981",
    pending: "#6b7280",
    text: "#ffffff",
    border: "#404040"
  },
  spacing: {
    matchWidth: 200,
    matchHeight: 80,
    columnGap: 120,
    rowGap: 40
  }
};

export const defaultTheme: BracketTheme = {
  name: "Default",
  colors: {
    background: "#ffffff",
    winners: "#3b82f6",
    losers: "#ef4444",
    finals: "#8b5cf6",
    completed: "#10b981",
    pending: "#6b7280",
    text: "#1f2937",
    border: "#e5e7eb"
  },
  spacing: {
    matchWidth: 200,
    matchHeight: 80,
    columnGap: 120,
    rowGap: 40
  }
};

export const bracketThemes = {
  challonge: challongeTheme,
  default: defaultTheme
};
