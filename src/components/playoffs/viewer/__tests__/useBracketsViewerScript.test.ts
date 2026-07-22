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
    mocks.loadBracketStyles.mockResolvedValue(undefined);
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
    mocks.viewerBundleEvaluation.mockImplementation(async () => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return {};
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
    mocks.viewerBundleEvaluation.mockImplementation(async () => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return {};
    });
    mocks.loadBracketStyles.mockRejectedValue(new Error('css import failed'));
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.error).toBe('Failed to load bracket viewer library'));
    expect(result.current.isReady).toBe(false);
  });

  it('shares one bundle evaluation across concurrent mounts', async () => {
    mocks.viewerBundleEvaluation.mockImplementation(async () => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return {};
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
    mocks.viewerBundleEvaluation.mockImplementation(async () => {
      windowWithViewer.bracketsViewer = fakeViewer();
      return {};
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
});
