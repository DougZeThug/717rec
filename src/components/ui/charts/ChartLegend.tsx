import { useTheme } from 'next-themes';
import * as React from 'react';
import type { LegendPayload } from 'recharts';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

import { useChart } from './chart-context';
import { getPayloadConfigFromPayload } from './utils/tooltipUtils';

export const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendContentProps extends React.ComponentProps<'div'> {
  payload?: LegendPayload[];
  verticalAlign?: 'top' | 'bottom' | 'middle';
  hideIcon?: boolean;
  nameKey?: string;
}

export const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  ({ className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey }, ref) => {
    const { config } = useChart();
    const { resolvedTheme } = useTheme();
    const isLight = resolvedTheme === 'light';

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(
            config,
            item as unknown as Parameters<typeof getPayloadConfigFromPayload>[1],
            key
          );

          return (
            <div
              key={item.value}
              className={cn(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3',
                isLight ? 'text-foreground' : 'text-gray-200'
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              <span
                className={cn(
                  isLight ? 'text-foreground font-semibold' : 'text-gray-200 font-normal'
                )}
              >
                {itemConfig?.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = 'ChartLegend';
