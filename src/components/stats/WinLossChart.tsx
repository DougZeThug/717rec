
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

  const chartTextColor = isDark ? "#e5e7eb" : "#111111";
  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  const tooltipBgColor = isDark ? "#111827" : "#ffffff";
  const tooltipTextColor = isDark ? "#f9fafb" : "#111827";
  const barColorWin = "#45c47e";
  const barColorLoss = "#e13d3d";

  // Custom tooltip
  const CustomWinLossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-md shadow-lg"
        style={{
          backgroundColor: tooltipBgColor,
          border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
          color: tooltipTextColor,
          fontFamily: "'Inter', sans-serif",
          padding: 8,
        }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div
      className="w-full h-[350px] rounded-xl"
      style={{
        backgroundColor: chartBgColor,
        borderRadius: 16,
        border: isLight ? "1px solid #e5e7eb" : undefined,
        boxShadow: isLight ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      <ResponsiveContainer width="100%" height="100%" style={{ backgroundColor: chartBgColor }}>
        <BarChart
          data={data}
          style={{
            background: chartBgColor,
            borderRadius: 12,
            padding: 8,
            fontFamily: "'Inter', sans-serif",
          }}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: isMobile ? 90 : 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={isMobile ? 80 : 70}
            interval={0}
            tick={{ fontSize: isMobile ? 10 : 12, fill: chartTextColor, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
          />
          <YAxis tick={{ fill: chartTextColor, fontWeight: 600, fontFamily: "'Inter', sans-serif" }} />
          <Tooltip content={<CustomWinLossTooltip />} />
          <Legend
            wrapperStyle={{
              color: chartTextColor,
              marginTop: 20,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
            }}
            formatter={(value) => (
              <span style={{ color: chartTextColor, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{value}</span>
            )}
          />
          <Bar dataKey="wins" fill={barColorWin} name="Wins" />
          <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossChart;
