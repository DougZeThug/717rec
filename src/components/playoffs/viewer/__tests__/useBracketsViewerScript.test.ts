import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// vi.hoisted keeps the same fn instances even after vi.resetModules()
// re-evaluates the mock factories.

const mocks = vi.hoisted(() => ({
  loadBracketStyles: vi.fn<() => Promise<void>>(),
  errorLog: vi.fn(),
}));

vi.mock('@/styles/bracket-styles', () => ({
  loadBracketStyles: mocks.loadBracketStyles,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: mocks.errorLog,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCRIPT_SELECTOR = 'script[src*="brackets-viewer"]';

const windowWithViewer = window as unknown as { bracketsViewer?: unknown };

/**
 * The hook module caches its script-load promise at module level, so each
 * test imports a fresh copy after vi.resetModules().
 */
const importHook = async () => {
  const mod = await import('../useBracketsViewerScript');
  return mod.useBracketsViewerScript;
};

const getInjectedScript = (): HTMLScriptElement | null =>
  document.head.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useBracketsViewerScript', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.loadBracketStyles.mockResolvedValue(undefined);
    delete windowWithViewer.bracketsViewer;
    document.querySelectorAll(SCRIPT_SELECTOR).forEach((el) => el.remove());
  });

  it('is ready immediately without injecting a script when the viewer global already exists', async () => {
    windowWithViewer.bracketsViewer = { render: vi.fn(), setParticipantImages: vi.fn() };
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
    expect(getInjectedScript()).toBeNull();
    expect(mocks.loadBracketStyles).not.toHaveBeenCalled();
  });

  it('injects the brackets-viewer CDN script with async loading', async () => {
    const useBracketsViewerScript = await importHook();

    const { result } = renderHook(() => useBracketsViewerScript());

    expect(result.current.isReady).toBe(false);
    const script = getInjectedScript();
    expect(script).not.toBeNull();
    expect(script?.src).toBe(
      'https://cdn.jsdelivr.net/npm/brackets-viewer@1.8.1/dist/brackets-viewer.min.js'
    );
    expect(script?.async).toBe(true);
  });

  it('becomes ready when the script loads and exposes the viewer global', async () => {
    const useBracketsViewerScript = await importHook();
    const { result } = renderHook(() => useBracketsViewerScript());

    const script = getInjectedScript();
    expect(script).not.toBeNull();

    act(() => {
      windowWithViewer.bracketsViewer = { render: vi.fn(), setParticipantImages: vi.fn() };
      script?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.error).toBeNull();
    expect(mocks.loadBracketStyles).toHaveBeenCalledTimes(1);
  });

  it('reports an error when the script loads but the viewer global is missing', async () => {
    const useBracketsViewerScript = await importHook();
    const { result } = renderHook(() => useBracketsViewerScript());

    act(() => {
      // Load fires but the library never attached itself to window
      getInjectedScript()?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => expect(result.current.error).toBe('brackets-viewer library not loaded'));
    expect(result.current.isReady).toBe(false);
    expect(mocks.errorLog).toHaveBeenCalledWith(
      'brackets-viewer is not available on window object'
    );
  });

  it('reports an error when the script fails to load', async () => {
    const useBracketsViewerScript = await importHook();
    const { result } = renderHook(() => useBracketsViewerScript());

    act(() => {
      getInjectedScript()?.dispatchEvent(new Event('error'));
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to load bracket viewer library'));
    expect(result.current.isReady).toBe(false);
    expect(mocks.errorLog).toHaveBeenCalledWith(
      'Failed to load brackets-viewer resources:',
      expect.any(Error)
    );
  });

  it('reports an error when loading the bracket styles fails', async () => {
    mocks.loadBracketStyles.mockRejectedValue(new Error('css import failed'));
    const useBracketsViewerScript = await importHook();
    const { result } = renderHook(() => useBracketsViewerScript());

    await waitFor(() => expect(result.current.error).toBe('Failed to load bracket viewer library'));
    expect(result.current.isReady).toBe(false);
  });

  it('reuses the in-flight script load instead of injecting a second tag', async () => {
    const useBracketsViewerScript = await importHook();

    const first = renderHook(() => useBracketsViewerScript());
    const second = renderHook(() => useBracketsViewerScript());

    expect(document.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1);

    act(() => {
      windowWithViewer.bracketsViewer = { render: vi.fn(), setParticipantImages: vi.fn() };
      getInjectedScript()?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => expect(first.result.current.isReady).toBe(true));
    await waitFor(() => expect(second.result.current.isReady).toBe(true));
    expect(document.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1);
  });

  it('retries the download on a fresh mount after a failed load', async () => {
    const useBracketsViewerScript = await importHook();

    // First mount: script fails to load
    const first = renderHook(() => useBracketsViewerScript());
    act(() => {
      getInjectedScript()?.dispatchEvent(new Event('error'));
    });
    await waitFor(() =>
      expect(first.result.current.error).toBe('Failed to load bracket viewer library')
    );
    first.unmount();

    // Failed tag must be gone so the retry can inject a fresh one
    expect(getInjectedScript()).toBeNull();

    // Second mount: a new script tag is injected and this time it loads
    const second = renderHook(() => useBracketsViewerScript());
    const retryScript = getInjectedScript();
    expect(retryScript).not.toBeNull();

    act(() => {
      windowWithViewer.bracketsViewer = { render: vi.fn(), setParticipantImages: vi.fn() };
      retryScript?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => expect(second.result.current.isReady).toBe(true));
    expect(second.result.current.error).toBeNull();
  });

  it('ignores late results after unmount (no error state mutation)', async () => {
    const useBracketsViewerScript = await importHook();
    const { result, unmount } = renderHook(() => useBracketsViewerScript());

    unmount();

    act(() => {
      getInjectedScript()?.dispatchEvent(new Event('error'));
    });
    // Allow the rejected promise chain to settle; cancelled flag must swallow it
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
