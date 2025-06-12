
import { Match, Team } from "@/types";

export const filterAndSortMatches = (
  matches: Match[],
  activeTab: string,
  searchTerm: string,
  teams: Team[] | undefined
): Match[] => {
  return matches
    .filter(match => {
      if (activeTab === "upcoming") {
        return !match.iscompleted;
      } else if (activeTab === "completed") {
        return match.iscompleted;
      }
      return true;
    })
    .filter(match => {
      if (!searchTerm || !teams) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const team1 = teams.find(t => t.id === match.team1Id);
      const team2 = teams.find(t => t.id === match.team2Id);
      
      return (
        (team1?.name || "").toLowerCase().includes(searchLower) ||
        (team2?.name || "").toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
};
