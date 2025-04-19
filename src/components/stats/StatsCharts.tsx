import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPowerScore } from "@/utils/powerScore";

interface ChartDataItem {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  powerScore: number;
  imageUrl?: string | null;
  logoUrl?: string | null;
  id: string;
}

interface StatsChartsProps {
  chartData: ChartDataItem[];
  chartLimit: number;
}

const StatsCharts = ({ chartData, chartLimit }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  
  // Extract top 10 teams by power score (or less if not enough data)
  const topByPowerScore = [...chartData]
    .sort((a, b) => b.powerScore - a.powerScore)
    .slice(0, 10);
  
  // Custom rendering for the power score chart labels
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width + 5} 
        y={y + 15} 
        fill="#000" 
        fontSize={12} 
        textAnchor="start"
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  return (
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
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: isMobile ? 100 : 80, // Increased bottom margin to prevent overlap
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={isMobile ? 90 : 70} // Increased height for mobile
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
            <CardTitle>Top 10 Power Scores</CardTitle>
            <CardDescription>Elite team performance ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topByPowerScore}
                  margin={{
                    top: 5,
                    right: 60,
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
                    tickFormatter={(value, index) => {
                      // Truncate long names
                      return value.length > 10 ? `${value.slice(0, 10)}...` : value;
                    }}
                    tick={(props) => {
                      const { payload, x, y, index } = props;
                      const team = topByPowerScore[index];
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <image 
                            href={team.logoUrl || team.imageUrl || undefined} 
                            x="-20" 
                            y="-10" 
                            height="20" 
                            width="20"
                            style={{ opacity: team.logoUrl || team.imageUrl ? 1 : 0 }}
                          />
                          <text x="-25" y="5" textAnchor="end" fontSize={12}>
                            {payload.value.length > 10 ? `${payload.value.slice(0, 10)}...` : payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'powerScore') {
                        return [formatPowerScore(value as number), 'Power Score'];
                      }
                      return [value, name];
                    }} 
                    labelFormatter={(name) => `Team: ${name}`}
                  />
                  <Bar 
                    dataKey="powerScore" 
                    fill="#9b87f5" 
                    name="Power Score"
                    background={{ fill: '#f5f5f5' }}
                    radius={[0, 4, 4, 0]}
                  >
                    {/* Highlight top team with a different color */}
                    {topByPowerScore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#6E59A5" : "#9b87f5"} />
                    ))}
                    <LabelList 
                      dataKey="powerScore" 
                      position="right" 
                      content={renderCustomizedLabel}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatsCharts;
