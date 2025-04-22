
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

  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  
  const barColorWin = "#45c47e";
  const barColorLoss = "#e13d3d";

  const CustomWinLossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-md shadow-lg p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-white font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }} className="m-0 text-sm">
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
            stroke="#64748b"
            tick={{
              fill: isDark ? "#e5e7eb" : "#334155",
              fontSize: isMobile ? 13 : 12,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <YAxis
            stroke="#64748b"
            tick={{
              fill: isDark ? "#e5e7eb" : "#334155",
              fontSize: isMobile ? 13 : 12,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <Tooltip content={<CustomWinLossTooltip />} />
          <Legend
            wrapperStyle={{
              fontFamily: "'Inter', sans-serif",
              fontSize: isMobile ? "13px" : "12px"
            }}
            formatter={(value) => (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{value}</span>
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
