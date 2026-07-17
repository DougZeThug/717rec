import { BarChart3, Smartphone } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyTraffic } from '@/hooks/useDailyTraffic';

const DAYS = 30;

const fmtDay = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TrafficMiniChart: React.FC = () => {
  const query = useDailyTraffic(DAYS);

  const rows = useMemo(() => query.data ?? [], [query.data]);

  const last7 = useMemo(() => rows.slice(-7), [rows]);
  const totals7 = useMemo(
    () =>
      last7.reduce(
        (acc, r) => ({
          ios: acc.ios + r.ios_visitors,
          android: acc.android + r.android_visitors,
          other: acc.other + r.other_visitors,
          visitors: acc.visitors + r.visitors,
        }),
        { ios: 0, android: 0, other: 0, visitors: 0 }
      ),
    [last7]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4" aria-hidden="true" />
          Real daily traffic (first-party)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && (
          <p className="text-sm text-muted-foreground">Loading last {DAYS} days…</p>
        )}
        {query.error && (
          <p className="text-sm text-red-500">
            Could not load traffic. Only admins can view this data.
          </p>
        )}
        {!query.isLoading && !query.error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No pageviews recorded yet. The beacon started with this release — data appears after
            users visit the app.
          </p>
        )}
        {rows.length > 0 && (
          <>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                  <Tooltip
                    labelFormatter={(v) => fmtDay(String(v))}
                    formatter={(value, name) => [
                      value as number,
                      name === 'visitors' ? 'Visitors' : String(name),
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="size-3.5" aria-hidden="true" />
              <span>Last 7 days:</span>
              <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
                iOS {totals7.ios}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
                Android {totals7.android}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
                Other {totals7.other}
              </span>
              <span className="ml-auto tabular-nums">Total {totals7.visitors}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrafficMiniChart;
