/**
 * Safely parse a JSON metadata string, returning an empty object on failure.
 */
export const parseMetadata = (metadataStr: string): Record<string, unknown> => {
  try {
    return JSON.parse(metadataStr);
  } catch {
    return {};
  }
};
