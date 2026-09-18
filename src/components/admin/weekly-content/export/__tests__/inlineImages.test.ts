import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ warnLog: vi.fn(), errorLog: vi.fn(), dbLog: vi.fn() }));

import { buildLogoResolver } from '../inlineImages';

const originalFetch = globalThis.fetch;

/** jsdom has FileReader but reading a Blob needs a deterministic stub. */
class StubFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: Blob & { __dataUrl?: string }) {
    this.result = blob.__dataUrl ?? 'data:image/png;base64,STUB';
    this.onload?.();
  }
}

const blobWith = (dataUrl: string) => {
  const blob = new Blob(['x']) as Blob & { __dataUrl?: string };
  blob.__dataUrl = dataUrl;
  return blob;
};

describe('buildLogoResolver', () => {
  beforeEach(() => {
    vi.stubGlobal('FileReader', StubFileReader);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('inlines each logo as a data URL', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blobWith('data:image/png;base64,AAA')),
      })
    ) as unknown as typeof fetch;

    const resolve = await buildLogoResolver(['https://cdn.example/a.png']);

    expect(resolve('https://cdn.example/a.png')).toBe('data:image/png;base64,AAA');
  });

  // The cache is the real hazard: a plain <img> elsewhere in the app stores a
  // response with no CORS headers, and reusing it taints the canvas.
  it('bypasses the HTTP cache, which may hold a header-less response', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blobWith('data:image/png;base64,AAA')),
      })
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await buildLogoResolver(['https://cdn.example/a.png']);

    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example/a.png', {
      mode: 'cors',
      cache: 'reload',
    });
  });

  it('fetches a repeated logo only once', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blobWith('data:image/png;base64,AAA')),
      })
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await buildLogoResolver([
      'https://cdn.example/a.png',
      'https://cdn.example/a.png',
      'https://cdn.example/a.png',
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // One bad logo draws that team's initials; it must not fail the whole pack.
  it('resolves a failed logo to null instead of throwing', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error('network down'))
    ) as unknown as typeof fetch;

    const resolve = await buildLogoResolver(['https://cdn.example/a.png']);

    expect(resolve('https://cdn.example/a.png')).toBeNull();
  });

  it('resolves a non-OK response to null', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false })) as unknown as typeof fetch;

    const resolve = await buildLogoResolver(['https://cdn.example/missing.png']);

    expect(resolve('https://cdn.example/missing.png')).toBeNull();
  });

  it('passes an already-inline image straight through without fetching', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const resolve = await buildLogoResolver(['data:image/png;base64,INLINE']);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(resolve('data:image/png;base64,INLINE')).toBe('data:image/png;base64,INLINE');
  });

  it('maps a null logo to null', async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const resolve = await buildLogoResolver([null]);

    expect(resolve(null)).toBeNull();
  });
});
