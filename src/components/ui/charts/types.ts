import type { ComponentType, ReactNode } from 'react';
import type { TooltipContentProps } from 'recharts';

export type ChartPayloadItem<TValue = unknown, TName = string> = NonNullable<
  TooltipContentProps<TValue, TName>['payload']
>[number];

export type ChartConfigMap = {
  [k: string]: {
    label?: ReactNode;
    icon?: ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};
