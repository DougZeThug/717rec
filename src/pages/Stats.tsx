
import React from "react";
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
import RankingsTable from "@/components/stats/RankingsTable";
import { Ranking, Team } from "@/types";
import { Loader2 } from "lucide-react";

const Stats = () => {
  const { data: teams, isLoading } = useTeamData();

  // Transform teams into rankings
  const calculateRankings = (teams: Team[]): Ranking[] => {
    return teams.map(team => {
      const totalGames = team.wins + team.losses;
      const winPercentage = totalGames > 0 ? team.wins / totalGames : 0;
      
      return {
        teamId: team.id,
        teamName: team.name,
        logoUrl: team.logoUrl,
        wins: team.wins,
        losses: team.losses,
        winPercentage: winPercentage,
        sos: Math.random() * 0.5 + 0.5 // Placeholder SOS value (would be calculated from opponent strength)
      };
    }).sort((a, b) => {
      // Sort by win percentage (descending)
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      // If win percentages are equal, sort by total wins (descending)
      return b.wins - a.wins;
    });
  };

  const rankings = teams ? calculateRankings(teams) : [];

  // Prepare data for charts
  const topTeamsData = rankings.slice(0, 8).map(team => ({
    name: team.teamName,
    wins: team.wins,
    losses: team.losses,
    winPercentage: Number((team.winPercentage * 100).toFixed(1))
  }));

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-cornhole-navy mb-8">Team Statistics</h1>

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
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Win-Loss Records</CardTitle>
              <CardDescription>Top 8 teams by win percentage</CardDescription>
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
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      interval={0}
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
          
          <Card>
            <CardHeader>
              <CardTitle>Win Percentage</CardTitle>
              <CardDescription>Top 8 teams by percentage</CardDescription>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Rankings</CardTitle>
            <CardDescription>Based on win percentage and strength of schedule (SOS)</CardDescription>
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
