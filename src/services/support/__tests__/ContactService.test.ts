import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { contactSchema, submitContactRequest } from '../ContactService';
import { DatabaseError } from '@/types/errors';

describe('ContactService honeypot', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ error: null });
  });

  it('schema accepts an optional website field', () => {
    const parsed = contactSchema.parse({
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'general_question',
      message: 'Hello there from a real user.',
      website: 'http://spam.example',
    });
    expect(parsed.website).toBe('http://spam.example');
  });

  it('schema works without website (real users)', () => {
    const parsed = contactSchema.parse({
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'general_question',
      message: 'Hello there from a real user.',
    });
    expect(parsed.website).toBeUndefined();
  });

  it('forwards website honeypot value to the edge function', async () => {
    await submitContactRequest({
      name: 'Bot',
      email: 'bot@example.com',
      subject: 'other',
      message: 'spam spam spam spam',
      website: 'http://spam.example',
    });

    expect(invokeMock).toHaveBeenCalledWith('send-support-email', {
      body: {
        name: 'Bot',
        email: 'bot@example.com',
        subject: 'other',
        message: 'spam spam spam spam',
        website: 'http://spam.example',
      },
    });
  });

  it('sends empty website when omitted', async () => {
    await submitContactRequest({
      name: 'Alice',
      email: 'alice@example.com',
      subject: 'other',
      message: 'a real message here',
    });

    expect(invokeMock).toHaveBeenCalledWith('send-support-email', {
      body: expect.objectContaining({ website: '' }),
    });
  });

  it('schema rejects an invalid email', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'not-an-email',
      subject: 'general_question',
      message: 'Hello there from a real user.',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(emailIssue).toBeDefined();
    }
  });

  it('throws DatabaseError when the edge function returns rate-limit (429)', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { status: 429, message: 'Too many requests. Please try again later.' },
    });

    await expect(
      submitContactRequest({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'other',
        message: 'a real message here',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('Too many requests'),
    });
  });

  it('throws DatabaseError when the edge function rejects an invalid email', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid email' },
    });

    await expect(
      submitContactRequest({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'other',
        message: 'a real message here',
      })
    ).rejects.toBeInstanceOf(DatabaseError);
  });

  it('throws DatabaseError when the edge function returns a generic 400', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { status: 400, message: 'All fields are required' },
    });

    await expect(
      submitContactRequest({
        name: 'Alice',
        email: 'alice@example.com',
        subject: 'other',
        message: 'a real message here',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('All fields are required'),
    });
  });
});
