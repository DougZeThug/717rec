import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';

const { mockFrom, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuth: { getUser: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table), auth: mockAuth },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { SeasonParticipationService } from '../SeasonParticipationService';

describe('SeasonParticipationService.submitParticipation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells a signed-out user to sign in, rather than to try again', async () => {
    // A retry cannot work here, so the reason has to survive to the toast.
    // As a bare Error it was sanitised to "Failed to save. Please try again."
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const thrown = await SeasonParticipationService.submitParticipation({
      seasonId: 'season-1',
      teamId: 'team-1',
      status: 'PLAYING',
    }).catch((error) => error);

    expect(thrown).toBeInstanceOf(AuthorizationError);
    expect(getUIErrorMessage(thrown, 'Failed to save')).toBe(
      'Failed to save: You must be signed in to submit season participation.'
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
