
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeamData } from "@/hooks/useTeamData";
import { useDivisions } from "@/hooks/useDivisions";
import RankingsTable from "@/components/stats/RankingsTable";
import { Match } from "@/types";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import StatsHeader from "@/components/stats/StatsHeader";
import StatsSummaryCards from "@/components/stats/StatsSummaryCards";
import StatsCharts from "@/components/stats/StatsCharts";

const Stats = () => {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const { divisions, isLoading: isLoadingDivisions } = useDivisions();
  const { data: teams, isLoading: isLoadingTeams } = useTeamData(selectedDivision);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const isMobile = useIsMobile();
  const { calculateRankings } = useTeamRankings(teams, matches);

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoadingMatches(true);
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const matchData = data.map((match): Match => ({
          id: match.id,
          team1Id: match.team1_id || '',
          team2Id: match.team2_id || '',
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          date: match.date || match.created_at,
          location: match.location || '',
          iscompleted: match.iscompleted || false,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          round_number: match.round_number,
          position: match.position,
          bracket_id: match.bracket_id,
          match_type: match.match_type,
          next_match_id: match.next_match_id,
          next_loser_match_id: match.next_loser_match_id,
          best_of: match.best_of
        }));
        
        setMatches(matchData);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setIsLoadingMatches(false);
      }
    };
    
    fetchMatches();
  }, []);

  const rankings = (teams && !isLoadingMatches) ? calculateRankings(teams, matches) : [];

  const chartLimit = isMobile ? 5 : 8;
  const topTeamsData = rankings.slice(0, chartLimit).map(team => ({
    name: team.teamName,
    wins: team.wins,
    losses: team.losses,
    winPercentage: Number((team.winPercentage * 100).toFixed(1))
  }));

  const handleDivisionChange = (value: string) => {
    setSelectedDivision(value === "all" ? null : value);
  };

  if (isLoadingTeams || isLoadingDivisions || isLoadingMatches) {
    return (
      <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-cornhole-navy animate-spin mb-4" />
          <p className="text-lg">Loading team statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cornhole-bg py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <StatsHeader 
          onDivisionChange={handleDivisionChange} 
          divisions={divisions} 
        />

        <StatsSummaryCards rankings={rankings} />

        <StatsCharts 
          chartData={topTeamsData} 
          chartLimit={chartLimit} 
        />

        <Card>
          <CardHeader>
            <CardTitle>Team Rankings</CardTitle>
            <CardDescription>Based on win percentage, strength of schedule (SOS), and current streak</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingsTable rankings={rankings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;
