import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigateWithTransition = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/navigation-context', () => ({
  useNavigation: () => ({
    navigateWithTransition: mockNavigateWithTransition,
    isNavigating: false,
  }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// Stub framer-motion so `m.div` renders a plain div. The real `m` requires a
// surrounding LazyMotion provider, which isn't present in these isolated tests.
vi.mock('framer-motion', () => {
  const motionProps = new Set([
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileInView',
    'layout',
  ]);
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const domProps: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(props)) {
            if (!motionProps.has(key)) domProps[key] = value;
          }
          return React.createElement(tag, { ...domProps, ref });
        }),
    }
  );
  return { m: motionProxy };
});

import MessageBoardFAB from '@/components/message-board/MessageBoardFAB';

describe('MessageBoardFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the floating action button with its accessible label', () => {
    render(<MessageBoardFAB />);
    expect(screen.getByRole('button', { name: 'Message Board' })).toBeInTheDocument();
  });

  it('navigates to the message board when clicked', () => {
    render(<MessageBoardFAB />);
    fireEvent.click(screen.getByRole('button', { name: 'Message Board' }));
    expect(mockNavigateWithTransition).toHaveBeenCalledTimes(1);
    expect(mockNavigateWithTransition).toHaveBeenCalledWith('/message-board');
  });
});
