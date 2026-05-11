import type { ChartConfigMap, ChartPayloadItem } from '../types';

type ChartPayload = ChartPayloadItem<unknown, string>;

type PayloadLike =
  | ChartPayload
  | {
      payload?: Record<string, unknown>;
      [key: string]: unknown;
    };

export function getPayloadConfigFromPayload(
  config: ChartConfigMap,
  payload: PayloadLike,
  key: string
) {
  const nestedPayload = payload.payload;

  let configLabelKey = key;

  if (typeof payload[key] === 'string') {
    configLabelKey = payload[key] as string;
  } else if (nestedPayload && typeof nestedPayload[key] === 'string') {
    configLabelKey = nestedPayload[key] as string;
  }

  return config[configLabelKey] ?? config[key];
}
