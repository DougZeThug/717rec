
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from "recharts";
import { useTheme } from "next-themes";
import { formatPowerScore } from "@/utils/powerScore";

// Simple truncation utility
const truncateLabel = (label: string, max = 10) =>
  label.length > max ? label.slice(0, max - 1) + "…" : label;

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
  const maxLabelLength = isMobile ? 7 : 12;

  // Force explicit sorting by win percentage calculation to ensure correct order
  const sortedData = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    // Clone array to avoid mutating props
    const dataClone = [...data];
    
    // Process and sort the data
    const processedData = dataClone
      .map((team, index) => ({
        ...team,
        // Force recalculation of win percentage to ensure consistency
        calculatedWinPct: team.wins + team.losses === 0 ? 0 : team.wins / (team.wins + team.losses),
        // Add displayName and sortIndex to ensure correct ordering
        displayName: team.name,
        sortIndex: index // Store original position
      }))
      .sort((a, b) => {
        // Primary sort: win percentage (descending)
        if (b.calculatedWinPct !== a.calculatedWinPct) {
          return b.calculatedWinPct - a.calculatedWinPct;
        }
        // Secondary sort: total wins (descending)
        return b.wins - a.wins;
      })
      .filter((team, index) => {
        // Teams with games get priority
        const hasPlayed = team.wins + team.losses > 0;
        // Return all teams with games, or teams without games if we have room
        return hasPlayed || index < chartLimit;
      })
      // Limit to chartLimit
      .slice(0, chartLimit);
      
    // Create an array with displayKeys as ordered names
    return processedData;
  }, [data, chartLimit]);

  // Log sorted data to confirm ordering
  console.log("Win-Loss Chart Sorted Data:", sortedData.map(team => ({
    name: team.displayName,
    record: `${team.wins}-${team.losses}`,
    winPct: team.calculatedWinPct.toFixed(3)
  })));

  // Final verification log before rendering
  console.log("Final sorted data passed to BarChart", sortedData.map(t => ({ 
    name: t.displayName, 
    wins: t.wins, 
    losses: t.losses, 
    pct: t.calculatedWinPct 
  })));

  // Custom X-axis tick with truncation and tooltip
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const label = payload.value;
    const truncated = truncateLabel(label, maxLabelLength);
    // Only show the tooltip if truncated
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{label}</title>
        <text
          y={0}
          x={0}
          dy={14}
          textAnchor="end"
          fill={isDark ? "#e5e7eb" : "#334155"}
          fontSize={isMobile ? 10 : 11}
          fontFamily="'Inter', sans-serif"
          transform={`rotate(-24)`}
          style={{ cursor: label.length > maxLabelLength ? "pointer" : undefined }}
        >
          {truncated}
        </text>
      </g>
    );
  };

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
    <div
      className="w-full max-h-[310px] h-[230px] rounded-xl overflow-hidden pb-0"
      style={{ backgroundColor: chartBgColor }}
    >
      {/* Legend above the chart for spacing/flexibility */}
      <div className="flex flex-row justify-end pl-2 pr-4 py-2">
        <Legend
          payload={[
            { value: "Wins", type: "square", color: barColorWin, id: "wins" },
            { value: "Losses", type: "square", color: barColorLoss, id: "losses" },
          ]}
          iconType="rect"
          wrapperStyle={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            display: "flex"
          }}
          formatter={(value: string) => (
            <span className="ml-1 text-xs text-gray-700 dark:text-gray-300 font-medium">{value}</span>
          )}
        />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{
            top: 8,
            right: 14,
            left: 8,
            bottom: isMobile ? 38 : 32,
          }}
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            dataKey="displayName"
            interval={0}
            height={isMobile ? 30 : 34}
            tickLine={false}
            axisLine={{ stroke: chartGridColor }}
            tick={<CustomXAxisTick />}
            padding={{ left: 6, right: 6 }}
          />
          <YAxis
            axisLine={{ stroke: chartGridColor }}
            tickLine={false}
            stroke="#64748b"
            tick={{
              fill: isDark ? "#e5e7eb" : "#334155",
              fontSize: 11,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <Tooltip content={<CustomWinLossTooltip />} />
          {/* No built-in Legend here; handled above BarChart */}
          <Bar dataKey="wins" fill={barColorWin} name="Wins" />
          <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossChart;
