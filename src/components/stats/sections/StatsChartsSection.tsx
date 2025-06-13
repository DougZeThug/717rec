
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Match } from "@/types";

interface StatsChartsSectionProps {
  matches: Match[];
}

const StatsChartsSection: React.FC<StatsChartsSectionProps> = ({ matches }) => {
  // Create mock data based on actual matches
  const completedMatches = matches.filter(match => match.iscompleted);
  const totalTeams = new Set([
    ...matches.map(m => m.team1Id),
    ...matches.map(m => m.team2Id)
  ]).size;

  const mockData = [
    { division: "Competitive", teams: Math.ceil(totalTeams * 0.3), matches: Math.ceil(completedMatches.length * 0.3) },
    { division: "Intermediate", teams: Math.ceil(totalTeams * 0.4), matches: Math.ceil(completedMatches.length * 0.4) },
    { division: "Recreational", teams: Math.ceil(totalTeams * 0.3), matches: Math.ceil(completedMatches.length * 0.3) }
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
