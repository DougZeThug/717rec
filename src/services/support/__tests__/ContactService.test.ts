import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { contactSchema, submitContactRequest } from '../ContactService';

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
});