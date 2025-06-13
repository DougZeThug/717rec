
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Ranking } from "@/types";

interface StatsChartsSectionProps {
  rankings: Ranking[];
}

const StatsChartsSection: React.FC<StatsChartsSectionProps> = ({ rankings }) => {
  // Create mock division data based on rankings
  const totalTeams = rankings.length;
  const totalMatches = rankings.reduce((sum, team) => sum + team.wins + team.losses, 0) / 2;

  const mockData = [
    { division: "Competitive", teams: Math.ceil(totalTeams * 0.3), matches: Math.ceil(totalMatches * 0.3) },
    { division: "Intermediate", teams: Math.ceil(totalTeams * 0.4), matches: Math.ceil(totalMatches * 0.4) },
    { division: "Recreational", teams: Math.ceil(totalTeams * 0.3), matches: Math.ceil(totalMatches * 0.3) }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Teams by Division</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="teams" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matches by Division</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="matches" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsChartsSection;
