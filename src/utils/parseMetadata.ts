import { errorLog } from '@/utils/logger';

/**
 * Safely parse a JSON metadata string, returning an empty object on failure.
 */
export const parseMetadata = (metadataStr: string): Record<string, unknown> => {
  try {
    return JSON.parse(metadataStr);
  } catch (e) {
    errorLog('Failed to parse metadata JSON:', e);
    return {};
  }
};
