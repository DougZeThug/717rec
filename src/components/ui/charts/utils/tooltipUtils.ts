export function getPayloadConfigFromPayload(config: any, payload: unknown, key: string) {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const payloadPayload =
    'payload' in payload &&
    typeof (payload as any).payload === 'object' &&
    (payload as any).payload !== null
      ? (payload as any).payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof (payload as any)[key] === 'string') {
    configLabelKey = (payload as any)[key];
  } else if (payloadPayload && key in payloadPayload && typeof payloadPayload[key] === 'string') {
    configLabelKey = payloadPayload[key];
  }
  return configLabelKey in config ? config[configLabelKey] : config[key];
}
