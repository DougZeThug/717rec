
import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPowerScore } from "@/utils/powerScore";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Theme-aware styles for charts
  const chartStyles = useMemo(() => {
    return {
      cardBg: "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm",
      chartBg: isLight ? "#fff" : "#20232A",
      chartInnerBg: isLight ? "#fafafa" : "#20232A",
      axisText: isLight ? "#333" : "#fff",
      gridColor: isLight ? "#ddd" : "#444",
      legendText: isLight ? "#333" : "#fff",
      tooltipBg: isLight ? "#f5f5f5" : "#23262b",
      tooltipBorder: isLight ? "#ccc" : "#444",
      tooltipText: isLight ? "#333" : "#fff",
      barColorWin: "#45c47e",
      barColorLoss: "#e13d3d",
      barColorPower: "#a288f5",
      fontFamily: "'Inter', sans-serif"
    };
  }, [isLight]);
  
  // Create a sorted array for power scores to use in the vertical bar chart
  const topByPowerScore = [...chartData]
    .sort((a, b) => b.powerScore - a.powerScore)
    .slice(0, 10)
    .map(team => ({
      name: team.name,
      powerScore: team.powerScore
    }));
  
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width + 5} 
        y={y + 15} 
        fill={chartStyles.axisText}
        fontSize={12} 
        textAnchor="start"
        fontFamily={chartStyles.fontFamily}
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  // Custom tooltip component for Win-Loss chart
  const CustomWinLossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="p-2 rounded-md shadow-lg" 
        style={{
          backgroundColor: chartStyles.tooltipBg,
          border: `1px solid ${chartStyles.tooltipBorder}`,
          color: chartStyles.tooltipText,
          fontFamily: chartStyles.fontFamily
        }}>
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Custom tooltip component for Power Score chart
  const CustomPowerScoreTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="p-2 rounded-md shadow-lg" 
        style={{
          backgroundColor: chartStyles.tooltipBg,
          border: `1px solid ${chartStyles.tooltipBorder}`,
          color: chartStyles.tooltipText,
          fontFamily: chartStyles.fontFamily
        }}>
        <p className="font-medium mb-1">{payload[0].payload.name}</p>
        <p style={{ color: chartStyles.barColorPower }}>
          Power Score: {formatPowerScore(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 font-inter">
      <Card className={`${isMobile ? '' : 'xl:col-span-2'} ${chartStyles.cardBg}`}>
        <CardHeader className="pb-2 rounded-t-xl" style={isLight ? { borderBottom: '1px solid #e0e0e0', borderTopLeftRadius: 12, borderTopRightRadius: 12, background:'#fff'} : {}}>
          <CardTitle className={`${isLight ? "text-[#1a1a1a]" : "text-white"} font-bold`}>Win-Loss Records</CardTitle>
          <CardDescription className={isLight ? "text-gray-600" : "text-gray-200"}>
            Top {chartLimit} teams by win percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <div className="h-[350px] w-full rounded-xl" style={{ 
            background: chartStyles.chartInnerBg, 
            borderRadius: 16,
            boxShadow: isLight ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                style={{ 
                  background: chartStyles.chartBg, 
                  borderRadius: 12, 
                  padding: 8,
                  fontFamily: chartStyles.fontFamily
                }}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: isMobile ? 90 : 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridColor} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={isMobile ? 80 : 70}
                  interval={0}
                  tick={{fontSize: isMobile ? 10 : 12, fill: chartStyles.axisText, fontFamily: chartStyles.fontFamily}}
                />
                <YAxis tick={{fill: chartStyles.axisText, fontFamily: chartStyles.fontFamily}} />
                <Tooltip content={<CustomWinLossTooltip />} />
                <Legend 
                  wrapperStyle={{color: chartStyles.legendText, marginTop: 20, fontFamily: chartStyles.fontFamily}}
                  formatter={(value) => <span style={{ color: chartStyles.legendText, fontFamily: chartStyles.fontFamily }}>{value}</span>}
                />
                <Bar dataKey="wins" fill={chartStyles.barColorWin} name="Wins" />
                <Bar dataKey="losses" fill={chartStyles.barColorLoss} name="Losses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {!isMobile && (
        <Card className={`${chartStyles.cardBg}`}>
          <CardHeader className="pb-2 rounded-t-xl" style={isLight ? { borderBottom: '1px solid #e0e0e0', borderTopLeftRadius: 12, borderTopRightRadius: 12, background: '#fff' } : {}}>
            <CardTitle className={`${isLight ? "text-[#1a1a1a]" : "text-white"} font-bold`}>Top 10 Power Scores</CardTitle>
            <CardDescription className={isLight ? "text-gray-600" : "text-gray-200"}>
              Elite team performance ranking
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <div className="h-[350px] w-full rounded-xl" style={{ 
              background: chartStyles.chartInnerBg, 
              borderRadius: 16,
              boxShadow: isLight ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topByPowerScore}
                  style={{ 
                    background: chartStyles.chartBg, 
                    borderRadius: 12, 
                    padding: 8,
                    fontFamily: chartStyles.fontFamily
                  }}
                  margin={{
                    top: 5, right: 60, left: 60, bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.gridColor}/>
                  <XAxis 
                    type="number" 
                    domain={[0, 100]} 
                    tick={{fill: chartStyles.axisText, fontFamily: chartStyles.fontFamily}}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={80}
                    tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
                    tick={{fill: chartStyles.axisText, fontFamily: chartStyles.fontFamily}}
                  />
                  <Tooltip content={<CustomPowerScoreTooltip />} />
                  <Bar 
                    dataKey="powerScore" 
                    fill={chartStyles.barColorPower} 
                    name="Power Score"
                    background={{ fill: isLight ? '#f1f0fb' : '#26282d' }}
                    radius={[0, 5, 5, 0]}
                  >
                    {topByPowerScore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#805fff" : chartStyles.barColorPower} />
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
