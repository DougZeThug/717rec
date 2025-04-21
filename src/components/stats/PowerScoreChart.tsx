
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, Legend,
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

  // Base colors for consistent theming
  const baseTextColor = isLight ? '#111111' : '#ffffff';
  const axisLineColor = isLight ? '#cccccc' : '#444444';
  const tickColor = isLight ? '#222222' : '#dddddd';
  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const tooltipBgColor = isDark ? "#111827" : "#ffffff";
  const tooltipBorderColor = isLight ? "#e5e7eb" : "#374151";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  
  const barColorPower = "#a288f5";
  const highlightFirst = "#805fff";

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 5}
        y={y + 15}
        fill={tickColor}
        fontSize={12}
        textAnchor="start"
        fontFamily="'Inter', sans-serif"
        fontWeight={isLight ? "600" : "400"}
      >
        {formatPowerScore(value)}
      </text>
    );
  };

  const CustomPowerScoreTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-md shadow-lg p-2"
        style={{
          backgroundColor: tooltipBgColor,
          border: `1px solid ${tooltipBorderColor}`,
          color: baseTextColor,
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          fontWeight: isLight ? 500 : 400
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 4, color: baseTextColor }}>{payload[0].payload.name}</p>
        <p style={{ color: barColorPower, fontWeight: 500 }}>
          Power Score: {formatPowerScore(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-[350px] rounded-xl overflow-hidden" style={{ backgroundColor: chartBgColor }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 60, left: 60, bottom: 5 }}
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={axisLineColor}
            tick={{
              fill: tickColor,
              fontSize: 12,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
            stroke={axisLineColor}
            tick={{
              fill: tickColor,
              fontSize: 12,
              fontFamily: "'Inter', sans-serif"
            }}
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
          <Legend
            wrapperStyle={{
              color: baseTextColor,
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              fontWeight: isLight ? 600 : 400
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PowerScoreChart;

