
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
  const topByPowerScore = [...chartData]
    .sort((a, b) => b.powerScore - a.powerScore)
    .slice(0, 10);

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width + 5} 
        y={y + 15} 
        fill="#fff" 
        fontSize={12} 
        textAnchor="start"
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 font-inter">
      <Card className={`${isMobile ? '' : 'xl:col-span-2'} p-4 bg-[#20232A] border-0 shadow-lg`}>
        <CardHeader>
          <CardTitle className="text-white font-bold">Win-Loss Records</CardTitle>
          <CardDescription className="text-gray-200">Top {chartLimit} teams by win percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: isMobile ? 90 : 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={isMobile ? 80 : 70}
                  interval={0}
                  tick={{fontSize: isMobile ? 10 : 12, fill: "#fff"}}
                />
                <YAxis tick={{fill: "#eee"}} />
                <Tooltip contentStyle={{backgroundColor: "#23262b", borderRadius: 8, color: "#fff"}} />
                <Legend wrapperStyle={{color: "#fff", marginTop: 20}} />
                <Bar dataKey="wins" fill="#45c47e" name="Wins" />
                <Bar dataKey="losses" fill="#e13d3d" name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className="p-4 bg-[#20232A] border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-white font-bold">Top 10 Power Scores</CardTitle>
            <CardDescription className="text-gray-200">Elite team performance ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topByPowerScore}
                  margin={{
                    top: 5, right: 60, left: 60, bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444"/>
                  <XAxis type="number" domain={[0, 100]} tick={{fill: "#fff"}} />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={80}
                    tickFormatter={(value, index) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                    tick={{fill: "#fff"}}
                  />
                  <Tooltip contentStyle={{backgroundColor: "#23262b", borderRadius: 8, color: "#fff"}} />
                  <Bar 
                    dataKey="powerScore" 
                    fill="#a288f5" 
                    name="Power Score"
                    background={{ fill: '#26282d' }}
                    radius={[0, 5, 5, 0]}
                  >
                    {topByPowerScore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#805fff" : "#a288f5"} />
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
