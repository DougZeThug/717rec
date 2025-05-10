
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { formatPowerScore } from "@/utils/colors/powerScoreColors";
import { useChartColors } from "@/utils/charts/chartStyleUtils";
import { PowerScoreDataItem } from "@/types/chart";
import { useIsMobile } from "@/hooks/use-mobile";

interface PowerScoreChartProps {
  data: PowerScoreDataItem[];
}

const PowerScoreChart: React.FC<PowerScoreChartProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = useChartColors();
  const isMobile = useIsMobile();

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 6}
        y={y + 14}
        fill={colors.textColor}
        fontSize={11}
        textAnchor="start"
        fontFamily="'Inter', sans-serif"
        fontWeight="500"
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  const CustomPowerScoreTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-md shadow-lg p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-white font-semibold mb-1">{payload[0].payload.name}</p>
        <p className="text-sm" style={{ color: colors.powerScore.bar, fontWeight: 500 }}>
          Power Score: {formatPowerScore(payload[0].value)}
        </p>
      </div>
    );
  };

  // Determine chart margins and number of teams to show based on mobile/desktop
  const chartMargins = isMobile 
    ? { top: 5, right: 45, left: 35, bottom: 5 } 
    : { top: 5, right: 45, left: 40, bottom: 5 };

  // For mobile, show fewer teams to avoid overcrowding
  const displayData = isMobile && data.length > 5 ? data.slice(0, 5) : data;

  return (
    <div 
      className="w-full rounded-xl overflow-hidden" 
      style={{ 
        backgroundColor: colors.background,
        height: isMobile ? "240px" : "260px",
        maxHeight: isMobile ? "240px" : "310px"
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={displayData}
          margin={chartMargins}
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={colors.mutedTextColor}
            tick={{
              fill: colors.textColor,
              fontSize: 11,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={isMobile ? 62 : 68}
            tickFormatter={(value: string) => value.length > (isMobile ? 8 : 10) ? `${value.slice(0, isMobile ? 8 : 10)}...` : value}
            stroke={colors.mutedTextColor}
            tick={{
              fill: colors.textColor,
              fontSize: 11,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <Tooltip content={<CustomPowerScoreTooltip />} />
          <Bar
            dataKey="powerScore"
            fill={colors.powerScore.bar}
            name="Power Score"
            background={{ fill: colors.powerScore.background }}
            radius={[0, 5, 5, 0]}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? colors.powerScore.highlight : colors.powerScore.bar} />
            ))}
            <LabelList
              dataKey="powerScore"
              position="right"
              content={renderCustomizedLabel}
            />
          </Bar>
          <Legend
            wrapperStyle={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px"
            }}
            formatter={(value) => (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{value}</span>
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PowerScoreChart;
