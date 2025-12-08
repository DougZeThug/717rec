
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import WinLossTooltip from "./WinLossTooltip";
import { useTheme } from "next-themes";
import { chartLog } from "@/utils/logger";

// Label truncation util (local to component)
const truncateLabel = (label: string, max = 10) =>
  label.length > max ? label.slice(0, max - 1) + "…" : label;

interface BarChartProps {
  data: Array<any>;
  isMobile: boolean;
}

/**
 * Presentational chart only, expects sorted data with .displayName and .tooltipName.
 */
const WinLossBarChart: React.FC<BarChartProps> = ({ data, isMobile }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  const barColorWin = "#45c47e";
  const barColorLoss = "#e13d3d";
  const maxLabelLength = isMobile ? 7 : 12;

  // X-Axis tick for truncation
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || typeof payload.value === "undefined") return null;
    const label = payload.value || "";
    const truncated = truncateLabel(label, maxLabelLength);

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
          style={{
            cursor: label.length > maxLabelLength ? "pointer" : undefined,
          }}
        >
          {truncated}
        </text>
      </g>
    );
  };

  // Add more detailed logging to help diagnose the issue
  chartLog("WinLossBarChart rendering with data length:", data?.length);
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    chartLog("No valid chart data available:", data);
    return (
      <div className="w-full h-[230px] rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  // Log final data for debugging - ensure displayName is unique and in correct order
  chartLog(
    "Rendering chart with data",
    data.map((t: any, i: number) => ({
      displayName: t.displayName,
      tooltipName: t.tooltipName,
      wins: t.wins,
      losses: t.losses,
      winPct: t.calculatedWinPct?.toFixed(3),
      idx: i
    }))
  );

  return (
    <div
      className="w-full max-h-[310px] h-[230px] rounded-xl overflow-hidden pb-0"
      style={{ backgroundColor: chartBgColor }}
    >
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
            display: "flex",
          }}
          formatter={(value: string) => (
            <span className="ml-1 text-xs text-gray-700 dark:text-gray-300 font-medium">{value}</span>
          )}
        />
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <Tooltip content={<WinLossTooltip />} />
          <Bar dataKey="wins" fill={barColorWin} name="Wins" />
          <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossBarChart;
