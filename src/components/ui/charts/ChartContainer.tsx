import { useTheme } from 'next-themes';
import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import { ChartStyle } from './ChartStyle';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

export const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  id?: string;
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;
    const { resolvedTheme } = useTheme();
    const { isWinterTheme } = useSeasonalThemeBase();
    const isLight = !isWinterTheme && resolvedTheme === 'light';

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            'flex aspect-video justify-center text-xs font-inter',
            isLight
              ? '[&_.recharts-cartesian-axis-tick_text]:!fill-gray-900 [&_.recharts-cartesian-axis-tick_text]:!font-semibold'
              : '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
            isLight
              ? "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-[#ddd]"
              : "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
            isLight
              ? '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[#ccc]'
              : '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border',
            "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
            '[&_.recharts-layer]:outline-none',
            isLight
              ? "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[#ddd]"
              : "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
            isLight
              ? '[&_.recharts-radial-bar-background-sector]:fill-gray-100'
              : '[&_.recharts-radial-bar-background-sector]:fill-muted',
            isLight
              ? '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-100/70'
              : '[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
            isLight
              ? "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-[#ddd]"
              : "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
            "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
            '[&_.recharts-sector]:outline-none',
            '[&_.recharts-surface]:outline-none',
            isWinterTheme
              ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))]'
              : isLight
                ? 'bg-white !text-gray-900'
                : 'bg-gray-900 text-white',
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';
