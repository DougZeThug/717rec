import { ViewerMatch } from './types';

/**
 * Map integer status codes (from brackets-manager SQL) to string status labels
 */
export function mapStatusToString(status: number): ViewerMatch['status'] {
  const statusMap: Record<number, ViewerMatch['status']> = {
    0: 'locked',
    1: 'waiting',
    2: 'ready',
    3: 'running',
    4: 'completed',
    5: 'archived',
  };
  return statusMap[status] || 'waiting';
}
