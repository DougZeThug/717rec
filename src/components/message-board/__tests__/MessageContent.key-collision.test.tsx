import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MessageContent from '../message-item/MessageContent';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

describe('MessageContent key generation', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('does not produce duplicate React keys when content contains the ::occurrence: delimiter', () => {
    const content = 'hello::occurrence:1\nhello\nhello';

    render(<MessageContent content={content} />);

    const duplicateKeyWarnings = consoleErrorSpy.mock.calls.filter((call) =>
      call[0]?.includes?.('Encountered two children with the same key')
    );
    expect(duplicateKeyWarnings.length).toBe(0);
  });
});
