import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// vi.hoisted keeps the same fn instances even after vi.resetModules()
// re-evaluates the mock factories.

const mocks = vi.hoisted(() => ({
  loadBracketStyles: vi.fn<() => Promise<void>>(),
  errorLog: vi.fn(),
  /**
   * Stands in for evaluating the brackets-viewer dist bundle (an IIFE whose
   * side effect registers window.bracketsViewer). Tests control whether the
   * chunk loads, fails, or loads without registering the global.
   */
  viewerBundleEvaluation: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('@/styles/bracket-styles', () => ({
  loadBracketStyles: mocks.loadBracketStyles,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: mocks.errorLog,
}));

vi.mock('../viewerBundleLoader', () => ({
  importViewerBundle: mocks.viewerBundleEvaluation,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const windowWithViewer = window as unknown as { bracketsViewer?: unknown };

const fakeViewer = () => ({ render: vi.fn(), setParticipantImages: vi.fn() });

/**
 * The hook module caches its load promise at module level, so each test
 * imports a fresh copy after vi.resetModules().
 */
const importHook = async () => {
  const mod = await import('../useBracketsViewerScript');
  return mod.useBracketsViewerScript;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useBracketsViewerScript', () => {
  beforeEach(() => {
    vi.resetModules();
    // resetAllMocks (not clearAllMocks) so a mockRejectedValue set in one
    // test cannot leak its rejection into the next test's default behavior.
    vi.resetAllMocks();
    // vi.fn() alone returns undefined, not a promise; this sets the resolved value.
    mocks.loadBracketStyles.mockResolvedValue(undefined); // skipcq: JS-W1042
    delete windowWithViewer.bracketsViewer;
  });

  it('is ready immediately without importing the bundle when the viewer global already exists', async () => {
    windowWithViewer.bracketsViewer = fakeViewer();
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mocks.viewerBundleEvaluation).not.toHaveBeenCalled();
    expect(mocks.loadBracketStyles).not.toHaveBeenCalled();
  });

  it('loads the viewer from the bundled npm dependency — no script tag, no CDN', async () => {
    mocks.viewerBundleEvaluation.mockImplementation(() => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return Promise.resolve({});
    });
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.error).toBeNull();
    expect(mocks.loadBracketStyles).toHaveBeenCalledTimes(1);
    // The old implementation injected a CDN <script> tag; nothing may touch
    // the DOM now.
    expect(document.head.querySelector('script[src*="brackets-viewer"]')).toBeNull();
  });

  it('reports an error when the bundle evaluates but the viewer global is missing', async () => {
    mocks.viewerBundleEvaluation.mockResolvedValue({});
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.error).toBe('brackets-viewer library not loaded'));
    expect(result.current.isReady).toBe(false);
    expect(mocks.errorLog).toHaveBeenCalledWith(
      'brackets-viewer is not available on window object'
    );
  });

  it('reports an error when the bundle chunk fails to load', async () => {
    mocks.viewerBundleEvaluation.mockRejectedValue(new Error('chunk failed'));
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.error).toBe('Failed to load bracket viewer library'));
    expect(result.current.isReady).toBe(false);
    expect(mocks.errorLog).toHaveBeenCalledWith(
      'Failed to load brackets-viewer resources:',
      expect.anything()
    );
  });

  it('reports an error when loading the bracket styles fails', async () => {
    mocks.viewerBundleEvaluation.mockImplementation(() => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return Promise.resolve({});
    });
    mocks.loadBracketStyles.mockRejectedValue(new Error('css import failed'));
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.error).toBe('Failed to load bracket viewer library'));
    expect(result.current.isReady).toBe(false);
  });

  it('shares one bundle evaluation across concurrent mounts', async () => {
    mocks.viewerBundleEvaluation.mockImplementation(() => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return Promise.resolve({});
    });
    const useBracketsViewerScript = await importHook();

    const first = renderHook(() => useBracketsViewerScript());
    const second = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(first.result.current.isReady).toBe(true));
    await waitFor(() => expect(second.result.current.isReady).toBe(true));
    expect(mocks.viewerBundleEvaluation).toHaveBeenCalledTimes(1);
  });

  it('retries the load on a fresh mount after a failed chunk load', async () => {
    // First mount: the chunk fails.
    mocks.viewerBundleEvaluation.mockRejectedValueOnce(new Error('offline'));
    let useBracketsViewerScript = await importHook();
    const first = renderHook(() => useBracketsViewerScript());
    await waitFor(() =>
      expect(first.result.current.error).toBe('Failed to load bracket viewer library')
    );
    first.unmount();

    // Browsers do not cache failed dynamic-import fetches, so a later mount
    // re-requests the chunk; vi.resetModules() emulates that fresh registry.
    vi.resetModules();
    mocks.viewerBundleEvaluation.mockImplementation(() => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return Promise.resolve({});
    });
    useBracketsViewerScript = await importHook();
    const second = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(second.result.current.isReady).toBe(true));
    expect(second.result.current.error).toBeNull();
  });

  it('ignores late results after unmount (no error state mutation)', async () => {
    let rejectEvaluation: ((error: Error) => void) | undefined;
    mocks.viewerBundleEvaluation.mockImplementation(
      () =>
        new Promise<unknown>((_resolve, reject) => {
          rejectEvaluation = reject;
        })
    );
    const useBracketsViewerScript = await importHook();
    const { result, unmount } = renderHook(() => useBracketsViewerScript());

    unmount();

    await act(async () => {
      rejectEvaluation?.(new Error('too late'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Losing signal mid-page is the usual reason the chunk never arrives. The
  // hook used to give up for good, so the bracket stayed broken until the
  // reader reloaded the page by hand.
  describe('recovering from a failed load without a page reload', () => {
    it('tries again on its own after a failed chunk load', async () => {
      vi.useFakeTimers();
      try {
        mocks.viewerBundleEvaluation.mockRejectedValueOnce(new Error('offline'));
        const useBracketsViewerScript = await importHook();
        const { result } = renderHook(() => useBracketsViewerScript());

        await vi.waitFor(() =>
          expect(result.current.error).toBe('Failed to load bracket viewer library')
        );

        // The chunk is reachable again by the time the backoff elapses.
        mocks.viewerBundleEvaluation.mockImplementation(() => {
          windowWithViewer.bracketsViewer = fakeViewer();
          return Promise.resolve({});
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(2000);
        });

        expect(result.current.isReady).toBe(true);
        expect(result.current.error).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('tries again the moment the browser says it is back online', async () => {
      mocks.viewerBundleEvaluation.mockRejectedValueOnce(new Error('offline'));
      const useBracketsViewerScript = await importHook();
      const { result } = renderHook(() => useBracketsViewerScript());

      await waitFor(() =>
        expect(result.current.error).toBe('Failed to load bracket viewer library')
      );

      mocks.viewerBundleEvaluation.mockImplementation(() => {
        windowWithViewer.bracketsViewer = fakeViewer();
        return Promise.resolve({});
      });

      // Sync callback: dispatching the event is not itself awaitable, and act
      // flushes the state update and the effect it re-runs before returning.
      // The load that effect starts is what the waitFor below is for.
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.error).toBeNull();
    });

    it('gives up on the timers rather than retrying forever', async () => {
      vi.useFakeTimers();
      try {
        mocks.viewerBundleEvaluation.mockRejectedValue(new Error('still offline'));
        const useBracketsViewerScript = await importHook();
        const { result } = renderHook(() => useBracketsViewerScript());

        const advance = async () => {
          await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000);
          });
          return mocks.viewerBundleEvaluation.mock.calls.length;
        };

        // Each retry is scheduled from inside an async effect, so they do not
        // all chain within a single advance. Ten rounds is far more than the
        // three-step backoff needs.
        let calls = 0;
        let previous = 0;
        for (let round = 0; round < 10; round++) {
          previous = calls;
          calls = await advance();
        }

        expect(calls).toBeGreaterThan(1); // it did retry
        // ...and then stopped. No timer loop draining the battery of a phone
        // left open on the bleachers.
        expect(calls).toBe(previous);
        expect(result.current.isReady).toBe(false);
        expect(result.current.error).toBe('Failed to load bracket viewer library');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
