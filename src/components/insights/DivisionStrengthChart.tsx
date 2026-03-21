import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { DivisionStrength } from '@/hooks/useLeagueInsights';
import { useChartColors } from '@/utils/charts/chartStyleUtils';

interface DivisionStrengthChartProps {
  divisions: DivisionStrength[];
}

const DIVISION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as DivisionStrength;
  return (
    <div className="rounded-md shadow-lg p-3 bg-popover border border-border">
      <p className="font-semibold text-popover-foreground mb-1">{data.division}</p>
      <p className="text-sm text-muted-foreground">
        Avg Power Score: <span className="font-mono font-medium">{data.avgPowerScore}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Avg Win Rate: <span className="font-mono font-medium">{data.avgWinPct}%</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Teams: <span className="font-mono font-medium">{data.teamCount}</span>
      </p>
    </div>
  );
};

const DivisionStrengthChart: React.FC<DivisionStrengthChartProps> = ({ divisions }) => {
  const colors = useChartColors();

  if (divisions.length === 0) return null;

  return (
    <div className="border rounded-lg bg-card shadow-sm p-4">
      <h3 className="font-bebas text-lg tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent mb-4">
        Division Strength
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={divisions} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: colors.mutedTextColor, fontSize: 11 }}
          />
          <YAxis
            dataKey="division"
            type="category"
            tick={{ fill: colors.textColor, fontSize: 12, fontWeight: 500 }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avgPowerScore" radius={[0, 4, 4, 0]} maxBarSize={32}>
            {divisions.map((_, index) => (
              <Cell key={index} fill={DIVISION_COLORS[index % DIVISION_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DivisionStrengthChart;
