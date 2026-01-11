import { useTheme } from 'next-themes';
import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { chartLog } from '@/utils/logger';

import ChartEmptyState from './ChartEmptyState';
import WinLossTooltip from './WinLossTooltip';

const truncateLabel = (label: string, max = 10) =>
  label.length > max ? label.slice(0, max - 1) + '…' : label;

interface BarChartProps {
  data: Array<any>;
  isMobile: boolean;
}

const WinLossBarChart: React.FC<BarChartProps> = ({ data, isMobile }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartBgColor = isDark ? '#1f2937' : '#ffffff';
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';
  const barColorWin = '#10b981';
  const barColorLoss = '#ef4444';
  const maxLabelLength = isMobile ? 7 : 12;

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload || typeof payload.value === 'undefined') return null;
    const label = payload.value || '';
    const truncated = truncateLabel(label, maxLabelLength);

    return (
      <g transform={`translate(${x},${y})`}>
        <title>{label}</title>
        <text
          y={0}
          x={0}
          dy={14}
          textAnchor="end"
          fill={isDark ? '#e5e7eb' : '#334155'}
          fontSize={isMobile ? 10 : 11}
          fontFamily="'Inter', sans-serif"
          transform={`rotate(-24)`}
          style={{
            cursor: label.length > maxLabelLength ? 'pointer' : undefined,
          }}
        >
          {truncated}
        </text>
      </g>
    );
  };

  chartLog('WinLossBarChart rendering with data length:', data?.length);

  // Check for empty/zero data
  const hasData =
    data &&
    Array.isArray(data) &&
    data.length > 0 &&
    data.some((d) => (d.wins || 0) + (d.losses || 0) > 0);

  if (!hasData) {
    return <ChartEmptyState message="Records available after matches" />;
  }

  chartLog(
    'Rendering chart with data',
    data.map((t: any, i: number) => ({
      displayName: t.displayName,
      wins: t.wins,
      losses: t.losses,
      idx: i,
    }))
  );

  return (
    <div
      className="w-full h-[220px] rounded-xl overflow-hidden"
      style={{ backgroundColor: chartBgColor }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 12,
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
              fill: isDark ? '#e5e7eb' : '#334155',
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <Tooltip content={<WinLossTooltip />} />
          <Bar dataKey="wins" fill={barColorWin} name="Wins" radius={[2, 2, 0, 0]} />
          <Bar dataKey="losses" fill={barColorLoss} name="Losses" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinLossBarChart;
