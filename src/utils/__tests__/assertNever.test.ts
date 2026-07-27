import { describe, expect, it } from 'vitest';

import { assertNever } from '../assertNever';

describe('assertNever', () => {
  it('throws with the supplied context and a string value', () => {
    expect(() => assertNever('pending' as never, 'logo status')).toThrow(
      'Unhandled logo status: pending'
    );
  });

  it('JSON-stringifies an object value so it is readable in the message', () => {
    expect(() => assertNever({ type: 'UNKNOWN_TOAST' } as never, 'toast action')).toThrow(
      'Unhandled toast action: {"type":"UNKNOWN_TOAST"}'
    );
  });

  it('falls back to a generic context when none is supplied', () => {
    expect(() => assertNever('surprise' as never)).toThrow('Unhandled value: surprise');
  });

  it('describes null without treating it as an object', () => {
    expect(() => assertNever(null as never, 'rivalry type')).toThrow(
      'Unhandled rivalry type: null'
    );
  });
});
