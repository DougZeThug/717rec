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

  const processedData = data.map(item => ({
    ...item,
    displayName: item.name.length > 12 ? `${item.name.slice(0, 10)}...` : item.name,
    fullName: item.name
  }));

  const CustomWinLossTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const fullName = processedData.find(item => item.displayName === label)?.fullName || label;
    
    return (
      <div className="rounded-md shadow-lg p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-white font-semibold mb-1">{fullName}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }} className="m-0 text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  const xAxisFontSize = isMobile ? 11 : 12;
  const xAxisAngle = isMobile ? 0 : -22;

  const chartMargins = {
    top: 5,
    right: 15,
    left: 8,
    bottom: isMobile ? 28 : 24,
  };

  return (
    <div className="w-full max-h-[310px] h-[260px] rounded-xl overflow-hidden" style={{ backgroundColor: chartBgColor }}>
      <div className="w-full flex flex-col">
        <div className="w-full flex justify-center mb-1">
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="top"
            iconSize={12}
            wrapperStyle={{
              paddingTop: 2,
              paddingBottom: 2,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: isDark ? "#e5e7eb" : "#222",
              fontWeight: 500,
              lineHeight: 1,
            }}
            formatter={(value: string) => (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{value}</span>
            )}
          />
        </div>
        <div className="w-full flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              margin={chartMargins}
              style={{
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis
                dataKey="displayName"
                angle={xAxisAngle}
                textAnchor={isMobile ? "middle" : "end"}
                height={isMobile ? 28 : 35}
                interval={0}
                stroke="#64748b"
                tick={{
                  fill: isDark ? "#e5e7eb" : "#334155",
                  fontSize: xAxisFontSize,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500
                }}
                minTickGap={2}
                tickFormatter={(value) => value}
              />
              <YAxis
                stroke="#64748b"
                tick={{
                  fill: isDark ? "#e5e7eb" : "#334155",
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif"
                }}
                allowDecimals={false}
                width={32}
              />
              <Tooltip content={<CustomWinLossTooltip />} />
              <Bar dataKey="wins" fill={barColorWin} name="Wins" />
              <Bar dataKey="losses" fill={barColorLoss} name="Losses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WinLossChart;
