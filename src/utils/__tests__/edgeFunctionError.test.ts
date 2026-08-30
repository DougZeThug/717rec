import { describe, expect, it, vi } from 'vitest';

import {
  AuthorizationError,
  BusinessLogicError,
  DatabaseError,
  ValidationError,
} from '@/types/errors';
import { throwEdgeFunctionError } from '@/utils/edgeFunctionError';
import { getUIErrorMessage } from '@/utils/errorHandler';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

/**
 * Shaped like the FunctionsHttpError supabase-js raises: a fixed message, with
 * the function's real response hanging off `context`.
 */
const invokeError = (status: number, body: unknown, { json = true } = {}) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: {
    status,
    clone: () => ({
      // Promise-returning rather than `async`: a real Response.json() rejects
      // on unparseable JSON, it does not throw synchronously.
      json: () =>
        json ? Promise.resolve(body) : Promise.reject(new SyntaxError('Unexpected token')),
      text: () => Promise.resolve(String(body)),
    }),
  },
});

const captureThrow = async (error: unknown, context: string) => {
  try {
    await throwEdgeFunctionError(error, context);
  } catch (thrown) {
    return thrown;
  }
  throw new Error('throwEdgeFunctionError did not throw');
};

describe('throwEdgeFunctionError', () => {
  it('keeps a rate-limit message so the user is not told to retry in vain', async () => {
    const thrown = await captureThrow(
      invokeError(429, { error: 'Too many requests. Please try again later.' }),
      'Failed to send message'
    );

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect(getUIErrorMessage(thrown, 'Failed to send message')).toBe(
      'Failed to send message: Too many requests. Please try again later.'
    );
  });

  it('keeps a validation message from a 400', async () => {
    const thrown = await captureThrow(
      invokeError(400, { error: 'Message contains too many links' }),
      'Failed to send message'
    );

    expect(thrown).toBeInstanceOf(ValidationError);
    expect(getUIErrorMessage(thrown, 'Failed to send message')).toBe(
      'Failed to send message: Message contains too many links'
    );
  });

  it.each([401, 403])('treats %s as an authorization failure', async (status) => {
    const thrown = await captureThrow(invokeError(status, { error: 'Not allowed' }), 'Failed');
    expect(thrown).toBeInstanceOf(AuthorizationError);
    // The function wrote this wording itself, so it reaches the user.
    expect(getUIErrorMessage(thrown, 'Failed')).toBe('Failed: Not allowed');
  });

  it('reads a message field when the function does not use error', async () => {
    const thrown = await captureThrow(
      invokeError(400, { message: 'Subject is required' }),
      'Failed'
    );
    expect(getUIErrorMessage(thrown, 'Failed')).toBe('Failed: Subject is required');
  });

  it('stays generic when the body is not JSON', async () => {
    const thrown = await captureThrow(
      invokeError(500, '<html>502</html>', { json: false }),
      'Failed'
    );
    expect(thrown).toBeInstanceOf(DatabaseError);
    expect(getUIErrorMessage(thrown, 'Failed')).toBe('Failed. Please try again.');
  });

  it('stays generic when the body carries no usable reason', async () => {
    const thrown = await captureThrow(invokeError(500, { ok: false }), 'Failed');
    expect(getUIErrorMessage(thrown, 'Failed')).toBe('Failed. Please try again.');
  });

  it('stays generic for a network error with no response at all', async () => {
    const thrown = await captureThrow(new TypeError('Failed to fetch'), 'Failed to send message');
    expect(thrown).toBeInstanceOf(DatabaseError);
    expect(getUIErrorMessage(thrown, 'Failed to send message')).toBe(
      'Failed to send message. Please try again.'
    );
  });

  it('never shows the placeholder supabase-js puts on the error', async () => {
    const thrown = await captureThrow(new TypeError('Failed to fetch'), 'Failed to send message');
    expect(getUIErrorMessage(thrown, 'Failed to send message')).not.toContain('non-2xx');
  });
});
