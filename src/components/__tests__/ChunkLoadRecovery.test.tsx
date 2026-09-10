import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkLoadRecovery } from '../ChunkLoadRecovery';

const originalLocation = window.location;
let reload: ReturnType<typeof vi.fn>;

beforeAll(() => {
  // The recovery is a document reload, which jsdom cannot perform.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, reload: vi.fn() },
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

beforeEach(() => {
  reload = window.location.reload as ReturnType<typeof vi.fn>;
  reload.mockClear();
  sessionStorage.clear();
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('ChunkLoadRecovery', () => {
  it('explains the connection rather than blaming the page, while offline', () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery />);

    expect(screen.getByRole('heading', { name: /did not download/i })).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('waits for the connection instead of reloading into the browser error page', () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery />);

    expect(reload).not.toHaveBeenCalled();
  });

  it('loads the page again by itself once the connection returns', () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery />);

    act(() => onlineManager.setOnline(true));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once and not once per flap', () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery />);

    act(() => onlineManager.setOnline(true));
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lets an impatient reader try again by hand', async () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
  // A reload builds a new component with a fresh ref, so a file that is
  // genuinely gone would otherwise reload, fail and reload forever.
  describe('when the page still will not download', () => {
    it('reloads once for a file that failed while the connection was fine', () => {
      render(<ChunkLoadRecovery />);

      expect(reload).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem('chunkReloadAt')).not.toBeNull();
    });

    it('does not reload again when it has just tried', () => {
      sessionStorage.setItem('chunkReloadAt', String(Date.now()));

      render(<ChunkLoadRecovery />);

      expect(reload).not.toHaveBeenCalled();
      expect(screen.getByText(/did not help/i)).toBeInTheDocument();
    });

    it('offers the button rather than looping', async () => {
      sessionStorage.setItem('chunkReloadAt', String(Date.now()));
      render(<ChunkLoadRecovery />);

      await userEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('tries again for a failure long after the last one', () => {
      // A later incident in the same visit is not the same loop.
      sessionStorage.setItem('chunkReloadAt', String(Date.now() - 60_000));

      render(<ChunkLoadRecovery />);

      expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload at all when the browser refuses storage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      render(<ChunkLoadRecovery />);

      // Without a way to remember an attempt, one reload could become endless.
      expect(reload).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });
});
