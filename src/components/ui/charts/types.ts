import type { ComponentType, ReactNode } from 'react';
import type { TooltipContentProps } from 'recharts';

type ChartValueType = number | string | ReadonlyArray<number | string>;

export type ChartPayloadItem<
  TValue extends ChartValueType = ChartValueType,
  TName extends string = string,
> = NonNullable<TooltipContentProps<TValue, TName>['payload']>[number];

export type ChartConfigMap = {
  [k: string]: {
    label?: ReactNode;
    icon?: ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};
