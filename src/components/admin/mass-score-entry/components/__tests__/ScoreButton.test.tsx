import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scoreLog } from '@/utils/logger';

import ScoreButton from '../ScoreButton';
import { SCORE_OPTIONS } from '../types';

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  return { ...actual, scoreLog: vi.fn() };
});

const option = SCORE_OPTIONS[0];

/** How many "after click" logs have been written. The button also logs on every render. */
const afterClickLogs = () =>
  vi.mocked(scoreLog).mock.calls.filter(([message]) => message === 'ScoreButton after click:')
    .length;

const renderButton = (props: { disabled?: boolean } = {}) => {
  const onClick = vi.fn();
  const view = render(
    <ScoreButton
      option={option}
      isSelected={false}
      onClick={onClick}
      matchId="match-1"
      matchDate="2026-11-19"
      {...props}
    />
  );
  return { onClick, ...view, button: screen.getByTestId(`score-button-${option.label}`) };
};

describe('ScoreButton after-click log', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs the state 100 ms after a click, once per click, with the same payload', () => {
    const { button, onClick } = renderButton();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(99);
    expect(afterClickLogs()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(afterClickLogs()).toBe(1);
    expect(scoreLog).toHaveBeenCalledWith('ScoreButton after click:', {
      matchId: 'match-1',
      matchDate: '2026-11-19',
      dateType: 'string',
      scores: '1-0',
      gameWins: '2-0',
      isSelected: false,
      label: option.label,
    });
  });

  it('logs once for every click, and a new click does not cancel the earlier log', () => {
    const { button } = renderButton();

    fireEvent.click(button);
    fireEvent.click(button);
    vi.advanceTimersByTime(100);

    expect(afterClickLogs()).toBe(2);
  });

  it('writes no after-click log when the button unmounts before the 100 ms are over', () => {
    const { button, unmount } = renderButton();

    fireEvent.click(button);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);
    expect(afterClickLogs()).toBe(0);
  });

  it('clears only the timers that have not fired when the button unmounts', () => {
    const { button, unmount } = renderButton();

    fireEvent.click(button);
    vi.advanceTimersByTime(100);
    fireEvent.click(button);
    unmount();
    vi.advanceTimersByTime(500);

    expect(afterClickLogs()).toBe(1);
  });

  it('starts no timer for a disabled button', () => {
    const { button, onClick } = renderButton({ disabled: true });

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
