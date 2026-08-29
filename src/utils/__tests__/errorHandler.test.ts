import { PostgrestError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthorizationError,
  BusinessLogicError,
  DatabaseError,
  DuplicateRoundError,
  LiveScoringNotEnabledError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from '@/types/errors';
import {
  convertErrorToString,
  ensureFound,
  getErrorMessage,
  getUIErrorMessage,
  handleDatabaseError,
  isDatabaseError,
  isNotFoundError,
  isServiceError,
  logError,
  withErrorHandling,
} from '@/utils/errorHandler';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  teamLog: vi.fn(),
  matchLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

const makePostgrestError = (overrides?: Partial<PostgrestError>): PostgrestError => {
  const base = {
    message: 'db error',
    code: '42P01',
    details: 'details text',
    hint: 'hint text',
    name: 'PostgrestError',
    ...overrides,
  };
  return {
    ...base,
    toJSON() {
      return {
        name: base.name,
        message: base.message,
        details: base.details,
        hint: base.hint,
        code: base.code,
      };
    },
  } as PostgrestError;
};

// ─── handleDatabaseError ─────────────────────────────────────────────────────

describe('handleDatabaseError', () => {
  it('throws a DatabaseError', () => {
    const error = makePostgrestError({ message: 'relation missing' });
    expect(() => handleDatabaseError(error, 'Fetch teams')).toThrow(DatabaseError);
  });

  it('includes context and original message in the thrown error', () => {
    const error = makePostgrestError({ message: 'null value' });
    try {
      handleDatabaseError(error, 'Insert record');
    } catch (e) {
      expect((e as DatabaseError).message).toContain('Insert record');
      expect((e as DatabaseError).message).toContain('null value');
    }
  });

  it('preserves code, details, and hint in the error details', () => {
    const error = makePostgrestError({ code: '23505', details: 'dup key', hint: 'try again' });
    try {
      handleDatabaseError(error, 'ctx');
    } catch (e) {
      const dbErr = e as DatabaseError;
      const details = dbErr.details as Record<string, string>;
      expect(details.code).toBe('23505');
      expect(details.details).toBe('dup key');
      expect(details.hint).toBe('try again');
    }
  });

  it('has return type never (always throws)', () => {
    const error = makePostgrestError();
    expect(() => handleDatabaseError(error, 'ctx')).toThrow();
  });
});

// ─── ensureFound ─────────────────────────────────────────────────────────────

describe('ensureFound', () => {
  it('returns data when it is not null or undefined', () => {
    expect(ensureFound('hello', 'Thing')).toBe('hello');
    expect(ensureFound(42, 'Number')).toBe(42);
    expect(ensureFound({ id: '1' }, 'Object')).toEqual({ id: '1' });
  });

  it('returns falsy-but-valid values', () => {
    expect(ensureFound(0, 'Zero')).toBe(0);
    expect(ensureFound('', 'EmptyString')).toBe('');
    expect(ensureFound(false, 'Bool')).toBe(false);
  });

  it('throws NotFoundError when data is null', () => {
    expect(() => ensureFound(null, 'Team')).toThrow(NotFoundError);
  });

  it('throws NotFoundError when data is undefined', () => {
    expect(() => ensureFound(undefined, 'Season')).toThrow(NotFoundError);
  });

  it('includes resource name in the error message', () => {
    try {
      ensureFound(null, 'Division');
    } catch (e) {
      expect((e as NotFoundError).message).toContain('Division');
    }
  });

  it('includes identifier in the error message when provided', () => {
    try {
      ensureFound(null, 'Team', 'abc-123');
    } catch (e) {
      expect((e as NotFoundError).message).toContain('abc-123');
    }
  });

  it('omits identifier segment when not provided', () => {
    try {
      ensureFound(null, 'Match');
    } catch (e) {
      expect((e as NotFoundError).message).toContain('Match not found');
    }
  });
});

// ─── withErrorHandling ───────────────────────────────────────────────────────

describe('withErrorHandling', () => {
  it('returns the result of a successful operation', async () => {
    const result = await withErrorHandling(() => Promise.resolve(42), 'ctx');
    expect(result).toBe(42);
  });

  it('re-throws ServiceErrors without wrapping them', async () => {
    const original = new NotFoundError('Team', 'id-1');
    await expect(withErrorHandling(() => Promise.reject(original), 'ctx')).rejects.toThrow(
      NotFoundError
    );
  });

  it('wraps unknown Errors in ServiceError', async () => {
    const unknownErr = new Error('unexpected');
    const thrown = await withErrorHandling(() => Promise.reject(unknownErr), 'ops').catch((e) => e);
    expect(thrown).toBeInstanceOf(ServiceError);
    expect(thrown.message).toContain('unexpected');
  });

  it('wraps non-Error throws in ServiceError', async () => {
    const nonErrorReason: unknown = 'plain string';
    const thrown = await withErrorHandling(() => Promise.reject(nonErrorReason), 'ctx').catch(
      (e) => e
    );
    expect(thrown).toBeInstanceOf(ServiceError);
  });

  it('includes context in wrapped error message', async () => {
    const thrown = await withErrorHandling(
      () => Promise.reject(new Error('boom')),
      'My context'
    ).catch((e) => e);
    expect(thrown.message).toContain('My context');
  });
});

// ─── Type guards ─────────────────────────────────────────────────────────────

describe('isServiceError', () => {
  it('returns true for ServiceError and subclasses', () => {
    expect(isServiceError(new ServiceError('msg', 'CODE'))).toBe(true);
    expect(isServiceError(new DatabaseError('msg'))).toBe(true);
    expect(isServiceError(new NotFoundError('Team'))).toBe(true);
    expect(isServiceError(new ValidationError('bad'))).toBe(true);
    expect(isServiceError(new AuthorizationError())).toBe(true);
  });

  it('returns false for plain Error and non-errors', () => {
    const missingError: unknown = undefined;

    expect(isServiceError(new Error('plain'))).toBe(false);
    expect(isServiceError('string')).toBe(false);
    expect(isServiceError(null)).toBe(false);
    expect(isServiceError(missingError)).toBe(false);
  });
});

describe('isDatabaseError', () => {
  it('returns true only for DatabaseError', () => {
    expect(isDatabaseError(new DatabaseError('msg'))).toBe(true);
  });

  it('returns false for other ServiceErrors', () => {
    expect(isDatabaseError(new NotFoundError('Team'))).toBe(false);
    expect(isDatabaseError(new ServiceError('msg', 'CODE'))).toBe(false);
    expect(isDatabaseError(new Error('plain'))).toBe(false);
  });
});

describe('isNotFoundError', () => {
  it('returns true only for NotFoundError', () => {
    expect(isNotFoundError(new NotFoundError('Team'))).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isNotFoundError(new DatabaseError('msg'))).toBe(false);
    expect(isNotFoundError(new Error('plain'))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});

// ─── General-purpose utilities ───────────────────────────────────────────────

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(getErrorMessage(new Error('something went wrong'))).toBe('something went wrong');
  });

  it('returns string errors directly', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('returns fallback for non-error values', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    const missingError: unknown = undefined;

    expect(getErrorMessage(missingError)).toBe('An unknown error occurred');
    expect(getErrorMessage(42)).toBe('An unknown error occurred');
    expect(getErrorMessage({ code: 1 })).toBe('An unknown error occurred');
  });
});

describe('convertErrorToString', () => {
  it('returns null when error is null or undefined', () => {
    const missingError: unknown = undefined;

    expect(convertErrorToString(null)).toBeNull();
    expect(convertErrorToString(missingError)).toBeNull();
  });

  it('returns the error message for Error instances', () => {
    expect(convertErrorToString(new Error('oops'))).toBe('oops');
  });

  it('returns the string directly for string errors', () => {
    expect(convertErrorToString('network down')).toBe('network down');
  });
});

describe('getUIErrorMessage', () => {
  /**
   * Build the error the way production does. Hand-constructing a DatabaseError
   * would put the Postgres code somewhere describeError never reads, so the
   * test would pass while the app stayed broken.
   */
  const databaseErrorFrom = (partial: Partial<PostgrestError>, context: string) => {
    try {
      handleDatabaseError(
        {
          message: 'some raw postgres text',
          details: '',
          hint: '',
          code: '',
          name: 'PostgrestError',
          ...partial,
        } as PostgrestError,
        context
      );
    } catch (error) {
      return error;
    }
    throw new Error('handleDatabaseError did not throw');
  };

  describe('database errors', () => {
    it('translates a unique violation instead of showing the raw text', () => {
      const error = databaseErrorFrom(
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint "teams_slug_key"',
        },
        'Failed to create team'
      );
      expect(getUIErrorMessage(error, 'Failed to create team')).toBe(
        'Failed to create team: That already exists. Give it a different name and try again.'
      );
    });

    it.each([
      ['23502', 'A required field is missing.'],
      ['23503', "This is still linked to other records, so it can't be changed yet."],
      ['23514', "Some of those values aren't allowed. Check the form and try again."],
      ['42501', 'You do not have permission to do this.'],
      ['PGRST301', 'You do not have permission to do this.'],
      ['PGRST116', 'That record no longer exists. Refresh and try again.'],
    ])('translates postgres code %s', (code, expected) => {
      const error = databaseErrorFrom({ code }, 'Failed to save');
      expect(getUIErrorMessage(error, 'Failed to save')).toBe(`Failed to save: ${expected}`);
    });

    it('falls back to a generic reason for an unmapped code', () => {
      const error = databaseErrorFrom(
        { code: '42P01', message: 'relation "match_rounds" does not exist' },
        'Failed to save round'
      );
      expect(getUIErrorMessage(error, 'Failed to save round')).toBe(
        'Failed to save round. Please try again.'
      );
    });

    it('never leaks table, constraint or policy names', () => {
      const error = databaseErrorFrom(
        {
          code: '',
          message: 'new row violates row-level security policy for table "match_rounds"',
        },
        'Failed to save round'
      );
      const message = getUIErrorMessage(error, 'Failed to save round');
      expect(message).toBe('Failed to save round: You do not have permission to do this.');
      expect(message).not.toContain('match_rounds');
      expect(message).not.toContain('row-level security');
    });

    it('does not mistake a "Failed to fetch" context for a network problem', () => {
      // Most of the 300+ handleDatabaseError contexts read "Failed to fetch X".
      // Pattern-matching the message for "fetch" would tell a user with a
      // permission error to check their internet connection.
      const error = databaseErrorFrom({ code: '42501', message: 'permission denied' }, 'x');
      expect(getUIErrorMessage(error, 'Failed to fetch teams')).toBe(
        'Failed to fetch teams: You do not have permission to do this.'
      );
    });

    it('translates a raw PostgrestError that was never wrapped', () => {
      const raw = {
        message: 'duplicate key value',
        details: '',
        hint: '',
        code: '23505',
      } as PostgrestError;
      expect(getUIErrorMessage(raw, 'Failed to create team')).toBe(
        'Failed to create team: That already exists. Give it a different name and try again.'
      );
    });
  });

  describe('authored errors pass through', () => {
    it.each([
      [new ValidationError('Name must be at least 2 characters')],
      [new NotFoundError('Team', 'abc')],
      [new BusinessLogicError('This match already has a result')],
      [new DuplicateRoundError('game-1', 3)],
      [new LiveScoringNotEnabledError()],
    ])('keeps the message of %s', (error) => {
      expect(getUIErrorMessage(error, 'Could not continue')).toBe(
        `Could not continue: ${error.message}`
      );
    });

    it('keeps the message of an authorization error', () => {
      // AuthorizationError is only ever built by our own code, so its wording
      // is authored and safe. Raw permission failures arrive as Postgres 42501
      // and are generalised on the database branch instead.
      expect(
        getUIErrorMessage(
          new AuthorizationError('You must be signed in to submit season participation.'),
          'Failed to save'
        )
      ).toBe('Failed to save: You must be signed in to submit season participation.');
    });
  });

  describe('untyped throwables stay generic', () => {
    it.each([[new Error('boom')], ['a thrown string'], [null], [undefined], [{ nope: true }]])(
      'does not show %s to the user',
      (error) => {
        expect(getUIErrorMessage(error, 'Failed to save')).toBe(
          'Failed to save. Please try again.'
        );
      }
    );

    it('returns a generic sentence when there is no context', () => {
      expect(getUIErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    });
  });

  it('returns the reason alone when no context is provided', () => {
    expect(getUIErrorMessage(new ValidationError('Pick a date first'))).toBe('Pick a date first');
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw when called with an Error', () => {
    expect(() => logError(new Error('test'), 'context')).not.toThrow();
  });

  it('does not throw when called with a string', () => {
    expect(() => logError('string error', 'context')).not.toThrow();
  });

  it('does not throw when called with null', () => {
    expect(() => logError(null, 'context')).not.toThrow();
  });
});
