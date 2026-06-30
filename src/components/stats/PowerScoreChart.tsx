import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useIsMobile } from '@/hooks/useMobile';
import { PowerScoreDataItem } from '@/types/chart';
import { useChartColors } from '@/utils/charts/chartStyleUtils';
import { formatPowerScore } from '@/utils/colors/powerScoreColors';

import ChartEmptyState from './ChartEmptyState';

interface PowerScoreChartProps {
  data: PowerScoreDataItem[];
}

// Module-scope label renderer. Recharts merges its own props (x, y, width, value)
// with the element's props (textColor) when used as 'content={<PowerScoreLabel ... />}'.
const PowerScoreLabel: React.FC<{
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  textColor?: string;
}> = ({ x = 0, y = 0, width = 0, value = 0, textColor }) => (
  <text
    x={x + width + 6}
    y={y + 14}
    fill={textColor}
    fontSize={11}
    textAnchor="start"
    fontFamily="'Inter', sans-serif"
    fontWeight="500"
  >
    {formatPowerScore(value)}
  </text>
);

// Module-scope tooltip. Recharts injects active/payload at render time.
const CustomPowerScoreTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
  barColor?: string;
}> = ({ active, payload, barColor }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md shadow-lg p-2 bg-popover border border-border">
      <p className="text-popover-foreground font-semibold mb-1">{payload[0].payload.name}</p>
      <p className="text-sm" style={{ color: barColor, fontWeight: 500 }}>
        Power Score: {formatPowerScore(payload[0].value)}
      </p>
    </div>
  );
};

const PowerScoreChart: React.FC<PowerScoreChartProps> = ({ data }) => {
  const colors = useChartColors();
  const isMobile = useIsMobile();

  // Check for empty/zero data
  const hasData = data && data.length > 0 && data.some((d) => d.powerScore > 0);

  if (!hasData) {
    return <ChartEmptyState message="Power scores available after matches" />;
  }

  const chartMargins = isMobile
    ? { top: 5, right: 45, left: 35, bottom: 5 }
    : { top: 5, right: 45, left: 40, bottom: 5 };

  const displayData = isMobile && data.length > 5 ? data.slice(0, 5) : data;

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: colors.background,
        height: isMobile ? '220px' : '240px',
        maxHeight: isMobile ? '220px' : '280px',
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
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={isMobile ? 62 : 68}
            tickFormatter={(value: string) =>
              value.length > (isMobile ? 8 : 10) ? `${value.slice(0, isMobile ? 8 : 10)}...` : value
            }
            stroke={colors.mutedTextColor}
            tick={{
              fill: colors.textColor,
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <Tooltip content={<CustomPowerScoreTooltip barColor={colors.powerScore.bar} />} />
          <Bar
            dataKey="powerScore"
            fill={colors.powerScore.bar}
            name="Power Score"
            background={{ fill: colors.powerScore.background }}
            radius={[0, 5, 5, 0]}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${entry.id ?? entry.name ?? index}`}
                fill={index === 0 ? colors.powerScore.highlight : colors.powerScore.bar}
              />
            ))}
            <LabelList
              dataKey="powerScore"
              position="right"
              content={<PowerScoreLabel textColor={colors.textColor} />}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PowerScoreChart;
