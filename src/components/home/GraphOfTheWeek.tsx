
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useHistoricalPowerScores } from "@/hooks/useHistoricalPowerScores";
import { Team } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatPowerScore } from "@/utils/powerScore";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface GraphOfTheWeekProps {
  featuredTeam?: Team;
}

const GraphOfTheWeek: React.FC<GraphOfTheWeekProps> = ({ featuredTeam }) => {
  const { historicalScores, loading } = useHistoricalPowerScores(
    featuredTeam?.id
  );

  if (!featuredTeam) {
    return null;
  }

  const teamData = historicalScores.find(item => item.team_id === featuredTeam.id);
  
  // Format data for the chart
  const chartData = teamData?.power_scores.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    powerScore: item.score
  })) || [];

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-cornhole-navy">Graph of the Week</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Tracking the power score progression
            </p>
          </div>
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={featuredTeam.imageUrl || featuredTeam.logoUrl || ''} alt={featuredTeam.name} />
              <AvatarFallback>{featuredTeam.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{featuredTeam.name}</h3>
              <p className="text-sm text-gray-600">
                {featuredTeam.wins}-{featuredTeam.losses} • Power Score: {formatPowerScore(featuredTeam.power_score)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p>Loading chart data...</p>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-64">
            <ChartContainer
              config={{
                powerScore: {
                  label: 'Power Score',
                  color: '#8B5CF6',
                }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    domain={[(dataMin: number) => Math.max(0, dataMin * 0.9), (dataMax: number) => dataMax * 1.1]}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0].value;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-1">
                              <div className="font-medium">{payload[0].payload.date}</div>
                              <div className="text-sm text-muted-foreground">
                                Power Score: {typeof value === 'number' 
                                  ? value.toFixed(1) 
                                  : (parseFloat(value as string) || 0).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="powerScore"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p>No historical data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GraphOfTheWeek;
