import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), matchLog: vi.fn(),
}));

// Import after mocks
import { MatchCommentsService } from '../MatchCommentsService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeComment = (overrides: Record<string, unknown> = {}) => ({
  id: 'comment-1', match_id: 'match-1', user_id: 'user-1',
  username: 'alice', team_name: 'Eagles', content: 'Good game!',
  created_at: '2026-04-17T18:00:00Z', ...overrides,
});

// ─── fetchComments ────────────────────────────────────────────────────────────

describe('MatchCommentsService.fetchComments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns comments on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [makeComment()], error: null }) }) }),
    });
    const result = await MatchCommentsService.fetchComments('match-1');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Good game!');
    expect(mockFrom).toHaveBeenCalledWith('match_comments');
  });

  it('returns empty array when no comments', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    expect(await MatchCommentsService.fetchComments('match-1')).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }) }),
    });
    await expect(MatchCommentsService.fetchComments('match-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── addComment ───────────────────────────────────────────────────────────────

describe('MatchCommentsService.addComment', () => {
  beforeEach(() => vi.clearAllMocks());

  const payload = { user_id: 'user-1', username: 'alice', team_name: 'Eagles', content: 'GG!' };

  it('returns the created comment on success', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: makeComment({ content: 'GG!' }), error: null }) }),
      }),
    });
    const result = await MatchCommentsService.addComment('match-1', payload);
    expect(result.content).toBe('GG!');
    expect(mockFrom).toHaveBeenCalledWith('match_comments');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(MatchCommentsService.addComment('match-1', payload)).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteComment ────────────────────────────────────────────────────────────

describe('MatchCommentsService.deleteComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    });
    await expect(MatchCommentsService.deleteComment('comment-1', 'user-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('match_comments');
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: pgError() }) }) }),
    });
    await expect(MatchCommentsService.deleteComment('comment-1', 'user-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchCommentAuthorInfo ───────────────────────────────────────────────────

describe('MatchCommentsService.fetchCommentAuthorInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns username and teamName on success', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { username: 'alice' }, error: null }) }) }),
        };
      }
      // team_memberships
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: { team: { name: 'Eagles' } }, error: null }) }),
        }),
      };
    });

    const result = await MatchCommentsService.fetchCommentAuthorInfo('user-1');
    expect(result.username).toBe('alice');
    expect(result.teamName).toBe('Eagles');
  });

  it('returns nulls when profile and membership are not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    const result = await MatchCommentsService.fetchCommentAuthorInfo('user-1');
    expect(result.username).toBeNull();
    expect(result.teamName).toBeNull();
  });

  it('throws DatabaseError when profile query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      };
    });
    await expect(MatchCommentsService.fetchCommentAuthorInfo('user-1')).rejects.toThrow(DatabaseError);
  });
});
