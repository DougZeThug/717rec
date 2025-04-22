
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

  const chartBgColor = isDark ? "#1f2937" : "#ffffff";
  const chartGridColor = isDark ? "#374151" : "#e5e7eb";
  
  const barColorPower = "#a288f5";
  const highlightFirst = "#805fff";

  const renderCustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 6}
        y={y + 14}
        fill={isDark ? "#e5e7eb" : "#334155"}
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
        <p className="text-sm" style={{ color: barColorPower, fontWeight: 500 }}>
          Power Score: {formatPowerScore(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-h-[310px] h-[260px] rounded-xl overflow-hidden" style={{ backgroundColor: chartBgColor }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 5, right: 45, left: 40, bottom: 5 }}
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#64748b"
            tick={{
              fill: isDark ? "#e5e7eb" : "#334155",
              fontSize: 11,
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={68}
            tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}...` : value}
            stroke="#64748b"
            tick={{
              fill: isDark ? "#e5e7eb" : "#334155",
              fontSize: 11,
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
