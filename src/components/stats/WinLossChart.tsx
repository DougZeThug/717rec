
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
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

interface WinLossChartProps {
  data: ChartDataItem[];
  chartLimit: number;
  isMobile: boolean;
}

const WinLossChart: React.FC<WinLossChartProps> = ({ data, chartLimit, isMobile }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  // Base colors for consistent theming
  const baseTextColor = isLight ? '#111111' : '#ffffff';
  const axisLineColor = isLight ? '#cccccc' : '#444444';
  const tickColor = isLight ? '#222222' : '#dddddd';
  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const tooltipBgColor = isDark ? "#111827" : "#ffffff";
  const tooltipBorderColor = isLight ? "#e5e7eb" : "#374151";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";

  const barColorWin = "#45c47e";
  const barColorLoss = "#e13d3d";

  // Custom tooltip with theme-aware colors
  const CustomWinLossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-md shadow-lg p-2"
        style={{
          backgroundColor: tooltipBgColor,
          border: `1px solid ${tooltipBorderColor}`,
          color: baseTextColor,
          fontFamily: "'Inter', sans-serif",
          fontSize: isMobile ? "13px" : "12px",
          fontWeight: isLight ? 500 : 400
        }}>
        <p style={{ fontWeight: 600, marginBottom: 4, color: baseTextColor }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color, margin: 0, fontWeight: isLight ? 500 : 400 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-[350px] rounded-xl overflow-hidden" style={{ backgroundColor: chartBgColor }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: isMobile ? 90 : 60,
          }}
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={isMobile ? 80 : 70}
            interval={0}
            stroke={axisLineColor}
            tick={{
              fill: tickColor,
              fontSize: isMobile ? 13 : 12,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <YAxis
            stroke={axisLineColor}
            tick={{
              fill: tickColor,
              fontSize: isMobile ? 13 : 12,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <Tooltip content={<CustomWinLossTooltip />} />
          <Legend
            wrapperStyle={{
              color: baseTextColor,
              fontFamily: "'Inter', sans-serif",
              fontSize: isMobile ? "13px" : "12px",
              fontWeight: isLight ? 600 : 400
            }}
          />
          <Bar dataKey="wins" fill={barColorWin} name="Wins" />
          <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossChart;

