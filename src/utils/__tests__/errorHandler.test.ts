import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PostgrestError } from '@supabase/supabase-js';
import {
  AuthorizationError,
  DatabaseError,
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
  handleHookError,
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

const makePostgrestError = (overrides?: Partial<PostgrestError>): PostgrestError => ({
  message: 'db error',
  code: '42P01',
  details: 'details text',
  hint: 'hint text',
  name: 'PostgrestError',
  ...overrides,
});

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
    const thrown = await withErrorHandling(() => Promise.reject(unknownErr), 'ops').catch(
      (e) => e
    );
    expect(thrown).toBeInstanceOf(ServiceError);
    expect(thrown.message).toContain('unexpected');
  });

  it('wraps non-Error throws in ServiceError', async () => {
    const thrown = await withErrorHandling(() => Promise.reject('plain string'), 'ctx').catch(
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
    expect(isServiceError(new Error('plain'))).toBe(false);
    expect(isServiceError('string')).toBe(false);
    expect(isServiceError(null)).toBe(false);
    expect(isServiceError(undefined)).toBe(false);
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
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    expect(getErrorMessage(42)).toBe('An unknown error occurred');
    expect(getErrorMessage({ code: 1 })).toBe('An unknown error occurred');
  });
});

describe('convertErrorToString', () => {
  it('returns null when error is null or undefined', () => {
    expect(convertErrorToString(null)).toBeNull();
    expect(convertErrorToString(undefined)).toBeNull();
  });

  it('returns the error message for Error instances', () => {
    expect(convertErrorToString(new Error('oops'))).toBe('oops');
  });

  it('returns the string directly for string errors', () => {
    expect(convertErrorToString('network down')).toBe('network down');
  });
});

describe('getUIErrorMessage', () => {
  it('returns just the message when no context provided', () => {
    expect(getUIErrorMessage(new Error('bad thing'))).toBe('bad thing');
  });

  it('prepends context when provided', () => {
    expect(getUIErrorMessage(new Error('bad thing'), 'Loading data')).toBe(
      'Loading data: bad thing'
    );
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

// ─── handleHookError ─────────────────────────────────────────────────────────

describe('handleHookError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('categorizes DatabaseError correctly', () => {
    const result = handleHookError(new DatabaseError('db fail'), 'ctx');
    expect(result.category).toBe('database');
    expect(result.userMessage).toContain('Database operation failed');
  });

  it('categorizes ValidationError and uses the error message as userMessage', () => {
    const result = handleHookError(new ValidationError('Username too short'), 'ctx');
    expect(result.category).toBe('validation');
    expect(result.userMessage).toBe('Username too short');
  });

  it('categorizes AuthorizationError correctly', () => {
    const result = handleHookError(new AuthorizationError(), 'ctx');
    expect(result.category).toBe('authorization');
    expect(result.userMessage).toContain('permission');
  });

  it('categorizes NotFoundError and uses the error message as userMessage', () => {
    const err = new NotFoundError('Team', 'abc');
    const result = handleHookError(err, 'ctx');
    expect(result.category).toBe('not_found');
    expect(result.userMessage).toContain('Team');
  });

  it('categorizes network errors by message keyword', () => {
    const result = handleHookError(new Error('network timeout'), 'ctx');
    expect(result.category).toBe('network');
    expect(result.userMessage).toContain('Network error');
  });

  it('categorizes fetch errors by message keyword', () => {
    const result = handleHookError(new Error('Failed to fetch'), 'ctx');
    expect(result.category).toBe('network');
  });

  it('categorizes unknown errors as unknown', () => {
    const result = handleHookError(new Error('random crash'), 'ctx');
    expect(result.category).toBe('unknown');
    expect(result.userMessage).toContain('unexpected error');
  });

  it('always returns a message string', () => {
    const result = handleHookError(new Error('some error'), 'ctx');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('handles non-Error throws gracefully', () => {
    const result = handleHookError('plain string throw', 'ctx');
    expect(result.category).toBe('unknown');
    expect(result.message).toBe('plain string throw');
  });
});
