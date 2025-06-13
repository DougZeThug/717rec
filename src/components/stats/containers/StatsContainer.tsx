
import React, { useState, useMemo } from "react";
import { Match, Ranking } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Flame, Trophy } from "lucide-react";
import StatsPageHeader from "./StatsPageHeader";
import StatsSummarySection from "./StatsSummarySection";
import StatsChartsSection from "./StatsChartsSection";
import FullRankingsSection from "./FullRankingsSection";
import LoadingStateContainer from "./LoadingStateContainer";
import { WeeklyHeatIndex } from "@/components/stats/weekly";

interface StatsContainerProps {
  matches: Match[];
  isLoadingMatches: boolean;
  matchesError: Error | null;
}

const StatsContainer: React.FC<StatsContainerProps> = ({
  matches,
  isLoadingMatches,
  matchesError,
}) => {
  const [activeTab, setActiveTab] = useState("standings");

  // Calculate rankings from matches data
  const rankings = useMemo((): Ranking[] => {
    if (!matches || matches.length === 0) return [];

    // Group matches by team and calculate stats
    const teamStats = new Map<string, {
      teamId: string;
      teamName: string;
      wins: number;
      losses: number;
      gamesWon: number;
      gamesLost: number;
    }>();

    matches.forEach(match => {
      if (!match.iscompleted) return;

      const team1Id = match.team1Id;
      const team2Id = match.team2Id;
      const team1Name = match.team1Details?.name || 'Unknown';
      const team2Name = match.team2Details?.name || 'Unknown';

      // Initialize team stats if not exists
      if (!teamStats.has(team1Id)) {
        teamStats.set(team1Id, {
          teamId: team1Id,
          teamName: team1Name,
          wins: 0,
          losses: 0,
          gamesWon: 0,
          gamesLost: 0
        });
      }
      if (!teamStats.has(team2Id)) {
        teamStats.set(team2Id, {
          teamId: team2Id,
          teamName: team2Name,
          wins: 0,
          losses: 0,
          gamesWon: 0,
          gamesLost: 0
        });
      }

      const team1Stats = teamStats.get(team1Id)!;
      const team2Stats = teamStats.get(team2Id)!;

      // Update game wins/losses
      team1Stats.gamesWon += match.team1_game_wins || 0;
      team1Stats.gamesLost += match.team2_game_wins || 0;
      team2Stats.gamesWon += match.team2_game_wins || 0;
      team2Stats.gamesLost += match.team1_game_wins || 0;

      // Update match wins/losses
      if (match.winnerId === team1Id) {
        team1Stats.wins++;
        team2Stats.losses++;
      } else if (match.winnerId === team2Id) {
        team2Stats.wins++;
        team1Stats.losses++;
      }
    });

    // Convert to Ranking objects
    return Array.from(teamStats.values()).map(stats => ({
      teamId: stats.teamId,
      teamName: stats.teamName,
      wins: stats.wins,
      losses: stats.losses,
      winPercentage: stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0,
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      gameWinPercentage: stats.gamesWon + stats.gamesLost > 0 ? stats.gamesWon / (stats.gamesWon + stats.gamesLost) : 0,
      sos: 0.5, // Default SOS
      powerScore: 0, // Default power score
      headToHead: {},
      closeMatchLosses: 0
    })).sort((a, b) => b.winPercentage - a.winPercentage);
  }, [matches]);

  if (isLoadingMatches) {
    return <LoadingStateContainer />;
  }

  if (matchesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Error loading matches: {matchesError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <StatsPageHeader />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standings" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Standings & Stats
          </TabsTrigger>
          <TabsTrigger value="weekly-heat" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Weekly Heat Index
          </TabsTrigger>
          <TabsTrigger value="playoffs" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Playoff Picture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-6">
          <StatsSummarySection rankings={rankings} />
          <StatsChartsSection rankings={rankings} />
          <FullRankingsSection rankings={rankings} />
        </TabsContent>

        <TabsContent value="weekly-heat" className="space-y-6">
          <WeeklyHeatIndex />
        </TabsContent>

        <TabsContent value="playoffs" className="space-y-6">
          <div className="text-center text-muted-foreground py-12">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Playoff standings and seeding information coming soon!</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsContainer;
