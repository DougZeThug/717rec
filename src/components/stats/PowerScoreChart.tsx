
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell
} from "recharts";
import { useTheme } from "next-themes";
import { formatPowerScore } from "@/utils/powerScore";

interface PowerScoreDataItem {
  name: string;
  powerScore: number;
}

interface PowerScoreChartProps {
  data: PowerScoreDataItem[];
}

const PowerScoreChart: React.FC<PowerScoreChartProps> = ({ data }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  const chartTextColor = isDark ? "#e5e7eb" : "#111111";
  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  const tooltipBgColor = isDark ? "#111827" : "#ffffff";
  const tooltipTextColor = isDark ? "#f9fafb" : "#111827";
  const barColorPower = "#a288f5";
  const highlightFirst = "#805fff";

  // Custom tooltip
  const CustomPowerScoreTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        style={{
          backgroundColor: tooltipBgColor,
          color: tooltipTextColor,
          border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
          fontFamily: "'Inter', sans-serif",
          borderRadius: 8,
          padding: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,.14)",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{payload[0].payload.name}</p>
        <p style={{ color: barColorPower, fontWeight: 500 }}>Power Score: {formatPowerScore(payload[0].value)}</p>
      </div>
    );
  };

  // Custom label for bar
  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 5}
        y={y + 15}
        fill={chartTextColor}
        fontSize={12}
        fontWeight={600}
        textAnchor="start"
        fontFamily="'Inter', sans-serif"
      >
        {formatPowerScore(value)}
      </text>
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
          layout="vertical"
          data={data}
          style={{
            background: chartBgColor,
            borderRadius: 12,
            padding: 8,
            fontFamily: "'Inter', sans-serif",
          }}
          margin={{
            top: 5, right: 60, left: 60, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor}/>
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: chartTextColor, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
            tick={{ fill: chartTextColor, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
          />
          <Tooltip content={<CustomPowerScoreTooltip />} />
          <Bar
            dataKey="powerScore"
            fill={barColorPower}
            name="Power Score"
            background={{ fill: isDark ? '#26282d' : '#f1f0fb' }}
            radius={[0, 5, 5, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? highlightFirst : barColorPower} />
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
  );
};

export default PowerScoreChart;
