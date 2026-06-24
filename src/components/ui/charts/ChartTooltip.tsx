// Recharts re-export lives next to the wrapper component so consumers can
// import { ChartTooltip, ChartTooltipContent } from a single module. The
// non-component alias is required by the Recharts API.
/* eslint-disable react-refresh/only-export-components */
import * as RechartsPrimitive from 'recharts';
export { ChartTooltipContent } from './ChartTooltipContent';

export const ChartTooltip = RechartsPrimitive.Tooltip;
