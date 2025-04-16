import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTeamData } from "@/hooks/useTeamData";
import { useDivisions } from "@/hooks/useDivisions";
import RankingsTable from "@/components/stats/RankingsTable";
import { Ranking, Team, Match, HeadToHeadMap } from "@/types";
import { Loader2, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const Stats = () => {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const { divisions, isLoading: isLoadingDivisions } = useDivisions();
  const { data: teams, isLoading: isLoadingTeams } = useTeamData(selectedDivision);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();

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
    
    const loadPreviousRankings = () => {
      try {
        const storedRankings = localStorage.getItem('previousRankings');
        if (storedRankings) {
          setPreviousRankings(JSON.parse(storedRankings));
        }
      } catch (error) {
        console.error('Error loading previous rankings:', error);
      }
    };
    
    fetchMatches();
    loadPreviousRankings();
  }, []);

  const calculateSOS = (team: Team, allTeams: Team[]) => {
    const otherTeams = allTeams.filter(t => t.id !== team.id);
    
    if (otherTeams.length === 0) return 0.5;
    
    let divisionWeight = 0.85;
    if (team.divisionName === 'Recreational') divisionWeight = 0.7;
    if (team.divisionName === 'Competitive') divisionWeight = 1.0;
    
    const opponentWinRates = otherTeams.map(opponent => {
      const totalGames = opponent.wins + opponent.losses;
      return totalGames > 0 ? (opponent.wins / totalGames) : 0.5;
    });
    
    const avgOpponentWinRate = opponentWinRates.reduce((sum, rate) => sum + rate, 0) / opponentWinRates.length;
    
    return avgOpponentWinRate * divisionWeight;
  };

  const calculateStreak = (teamId: string, matches: Match[]) => {
    const teamMatches = matches
      .filter(match => 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (teamMatches.length === 0) return undefined;
    
    let streakCount = 1;
    let isWin = teamMatches[0].winnerId === teamId;
    
    for (let i = 1; i < teamMatches.length; i++) {
      const match = teamMatches[i];
      const currentIsWin = match.winnerId === teamId;
      
      if (currentIsWin === isWin) {
        streakCount++;
      } else {
        break;
      }
    }
    
    return isWin ? `W${streakCount}` : `L${streakCount}`;
  };

  const calculateHeadToHead = (teamId: string, allTeams: Team[], matches: Match[]): HeadToHeadMap => {
    const result: HeadToHeadMap = {};
    
    allTeams.forEach(team => {
      if (team.id !== teamId) {
        result[team.id] = {
          opponentName: team.name,
          wins: 0,
          losses: 0
        };
      }
    });
    
    matches
      .filter(match => 
        match.iscompleted && 
        (match.team1Id === teamId || match.team2Id === teamId)
      )
      .forEach(match => {
        const isTeam1 = match.team1Id === teamId;
        const opponentId = isTeam1 ? match.team2Id : match.team1Id;
        
        if (opponentId && result[opponentId]) {
          if (match.winnerId === teamId) {
            result[opponentId].wins += 1;
          } else if (match.loserId === teamId) {
            result[opponentId].losses += 1;
          }
        }
      });
    
    return result;
  };

  const calculateRankings = (teams: Team[]): Ranking[] => {
    const rankings = teams.map(team => {
      const totalGames = team.wins + team.losses;
      const winPercentage = totalGames > 0 ? team.wins / totalGames : 0;
      const sos = calculateSOS(team, teams);
      const streak = calculateStreak(team.id, matches);
      const headToHead = calculateHeadToHead(team.id, teams, matches);
      const previousRank = previousRankings[team.id];
      
      return {
        teamId: team.id,
        teamName: team.name,
        logoUrl: team.logoUrl,
        imageUrl: team.imageUrl,
        wins: team.wins,
        losses: team.losses,
        winPercentage,
        divisionName: team.divisionName,
        sos,
        streak,
        headToHead,
        previousRank
      };
    });
    
    const sortedRankings = rankings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.sos - a.sos;
    });
    
    sortedRankings.forEach((ranking, index) => {
      if (ranking.previousRank !== undefined) {
        ranking.rankChange = ranking.previousRank - (index + 1);
      }
    });
    
    return sortedRankings;
  };

  useEffect(() => {
    if (teams && teams.length > 0 && !isLoadingTeams && !isLoadingMatches) {
      const currentRankings = calculateRankings(teams);
      const rankingsToSave: Record<string, number> = {};
      
      currentRankings.forEach((ranking, index) => {
        rankingsToSave[ranking.teamId] = index + 1;
      });
      
      localStorage.setItem('previousRankings', JSON.stringify(rankingsToSave));
    }
  }, [teams, isLoadingTeams, isLoadingMatches]);

  const rankings = (teams && !isLoadingMatches) ? calculateRankings(teams) : [];

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-cornhole-navy">Team Statistics</h1>
          
          <div className="flex items-center gap-2">
            <Filter size={18} />
            <div className="w-[180px]">
              <Select onValueChange={handleDivisionChange} defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Teams</CardTitle>
              <CardDescription>Active teams in the league</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-cornhole-navy">{rankings.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Highest Win %</CardTitle>
              <CardDescription>Best performing team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-cornhole-green">
                  {rankings.length > 0 ? (rankings[0]?.winPercentage * 100).toFixed(1) : 0}%
                </span>
                <span className="text-sm text-gray-500">
                  {rankings.length > 0 ? rankings[0]?.teamName : 'No teams'}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Most Wins</CardTitle>
              <CardDescription>Team with the most victories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-cornhole-navy">
                  {rankings.length > 0 ? 
                    rankings.reduce((max, team) => Math.max(max, team.wins), 0) : 
                    0}
                </span>
                <span className="text-sm text-gray-500">
                  {rankings.length > 0 ? 
                    rankings.reduce((maxTeam, team) => team.wins > maxTeam.wins ? team : maxTeam, rankings[0]).teamName : 
                    'No teams'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <Card className={`${isMobile ? '' : 'xl:col-span-2'}`}>
            <CardHeader>
              <CardTitle>Win-Loss Records</CardTitle>
              <CardDescription>Top {chartLimit} teams by win percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTeamsData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: isMobile ? 80 : 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{fontSize: isMobile ? 10 : 12}}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="wins" fill="#2C5530" name="Wins" />
                    <Bar dataKey="losses" fill="#1E3A5F" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {!isMobile && (
            <Card>
              <CardHeader>
                <CardTitle>Win Percentage</CardTitle>
                <CardDescription>Top {chartLimit} teams by percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topTeamsData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 60,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80}
                        tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="winPercentage" fill="#9E7E5A" name="Win %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
