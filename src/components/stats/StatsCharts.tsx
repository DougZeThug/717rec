import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell
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
  theme?: string; // receive theme
}

const StatsCharts = ({ chartData, chartLimit, theme }: StatsChartsProps) => {
  const isMobile = useIsMobile();
  const isLight = theme === "light";
  const cardBg = isLight ? "bg-[#fff] border border-[#e0e0e0] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "bg-[#20232A] border-0 text-white";
  const chartBg = isLight ? "#fff" : "#20232A";
  const axisText = isLight ? "#333" : "#fff";
  const gridColor = isLight ? "#e0e0e0" : "#444";
  const legendText = isLight ? "#333" : "#fff";
  const tooltipBg = isLight ? "#f5f5f5" : "#23262b";
  const barColorWin = "#45c47e";
  const barColorLoss = "#e13d3d";
  const barColorPower = "#a288f5";

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width + 5} 
        y={y + 15} 
        fill={axisText}
        fontSize={12} 
        textAnchor="start"
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 font-inter">
      <Card className={`${isMobile ? '' : 'xl:col-span-2'} ${cardBg} p-4`}>
        <CardHeader>
          <CardTitle className={`${isLight ? "text-[#1a1a1a]" : "text-white"} font-bold`}>Win-Loss Records</CardTitle>
          <CardDescription className={isLight ? "text-gray-600" : "text-gray-200"}>
            Top {chartLimit} teams by win percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] bg-[#fff] rounded-lg" style={isLight ? { background: '#fff', borderRadius: 12 } : {}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                style={{ background: chartBg, borderRadius: 12, padding: 8 }}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: isMobile ? 90 : 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={isMobile ? 80 : 70}
                  interval={0}
                  tick={{fontSize: isMobile ? 10 : 12, fill: axisText}}
                />
                <YAxis tick={{fill: axisText}} />
                <Tooltip contentStyle={{backgroundColor: tooltipBg, borderRadius: 8, color: axisText}} />
                <Legend wrapperStyle={{color: legendText, marginTop: 20}} />
                <Bar dataKey="wins" fill={barColorWin} name="Wins" />
                <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className={`${cardBg} p-4`}>
          <CardHeader>
            <CardTitle className={`${isLight ? "text-[#1a1a1a]" : "text-white"} font-bold`}>Top 10 Power Scores</CardTitle>
            <CardDescription className={isLight ? "text-gray-600" : "text-gray-200"}>
              Elite team performance ranking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]" style={isLight ? { background: '#fff', borderRadius: 12 } : {}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topByPowerScore}
                  style={{ background: chartBg, borderRadius: 12, padding: 8 }}
                  margin={{
                    top: 5, right: 60, left: 60, bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor}/>
                  <XAxis type="number" domain={[0, 100]} tick={{fill: axisText}} />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={80}
                    tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                    tick={{fill: axisText}}
                  />
                  <Tooltip contentStyle={{backgroundColor: tooltipBg, borderRadius: 8, color: axisText}} />
                  <Bar 
                    dataKey="powerScore" 
                    fill={barColorPower} 
                    name="Power Score"
                    background={{ fill: isLight ? '#f1f0fb' : '#26282d' }}
                    radius={[0, 5, 5, 0]}
                  >
                    {topByPowerScore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#805fff" : barColorPower} />
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
