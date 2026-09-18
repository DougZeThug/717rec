import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToPng, mockGetFontEmbedCss, mockAwaitImagesDecoded } = vi.hoisted(() => ({
  mockToPng: vi.fn(),
  mockGetFontEmbedCss: vi.fn(),
  mockAwaitImagesDecoded: vi.fn(),
}));

vi.mock('html-to-image', () => ({ toPng: mockToPng }));
vi.mock('../embedFonts', () => ({ getFontEmbedCss: mockGetFontEmbedCss }));
vi.mock('../inlineImages', () => ({ awaitImagesDecoded: mockAwaitImagesDecoded }));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import {
  RECAP_GRAPHIC_HEIGHT,
  RECAP_GRAPHIC_WIDTH,
} from '@/components/recap/graphics/recapGraphicTokens';

import { useGraphicExport } from '../useGraphicExport';

const node = () => document.createElement('div');
const request = (fileName: string) => ({ node: node(), fileName });

beforeEach(() => {
  vi.clearAllMocks();
  mockToPng.mockResolvedValue('data:image/png;base64,AAA');
  mockGetFontEmbedCss.mockResolvedValue('@font-face{}');
  mockAwaitImagesDecoded.mockResolvedValue(undefined);
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  HTMLAnchorElement.prototype.click = vi.fn();
});

describe('useGraphicExport', () => {
  it('captures at exactly the published size, at 1x', async () => {
    const { result } = renderHook(() => useGraphicExport());

    await act(async () => {
      await result.current.capture(node());
    });

    expect(mockToPng).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        width: RECAP_GRAPHIC_WIDTH,
        height: RECAP_GRAPHIC_HEIGHT,
        // Explicit, or a Retina laptop would produce 2160x2700 from the same
        // button that gives 1080x1350 elsewhere.
        pixelRatio: 1,
        skipAutoScale: true,
      })
    );
  });

  it('supplies the fonts itself, so the export does not drop self-hosted ones', async () => {
    const { result } = renderHook(() => useGraphicExport());

    await act(async () => {
      await result.current.capture(node());
    });

    expect(mockGetFontEmbedCss).toHaveBeenCalled();
    expect(mockToPng.mock.calls[0][1].fontEmbedCSS).toBe('@font-face{}');
    // And it waits for the logos to decode before capturing.
    expect(mockAwaitImagesDecoded).toHaveBeenCalled();
  });

  it('names each download after its request', async () => {
    const { result } = renderHook(() => useGraphicExport());
    const link = document.createElement('a');
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(link);

    act(() => {
      result.current.download('data:image/png;base64,AAA', '717rec-fall-2026-week-6-rankings-1');
    });

    expect(link.download).toBe('717rec-fall-2026-week-6-rankings-1.png');
    createElement.mockRestore();
  });

  it('exports every graphic and reports the count', async () => {
    const { result } = renderHook(() => useGraphicExport());

    let outcome: { exported: number; failed: string[] } | undefined;
    await act(async () => {
      outcome = await result.current.exportAll([request('a'), request('b')]);
    });

    expect(outcome).toEqual({ exported: 2, failed: [] });
  });

  it('names the graphics that failed and still exports the rest', async () => {
    mockToPng
      .mockResolvedValueOnce('data:image/png;base64,AAA')
      .mockRejectedValueOnce(new Error('canvas tainted'))
      .mockResolvedValueOnce('data:image/png;base64,AAA');

    const { result } = renderHook(() => useGraphicExport());

    let outcome: { exported: number; failed: string[] } | undefined;
    await act(async () => {
      outcome = await result.current.exportAll([
        request('recap'),
        request('rankings-1'),
        request('standings-competitive'),
      ]);
    });

    // One bad graphic must not cost the admin the whole pack.
    expect(outcome?.exported).toBe(2);
    expect(outcome?.failed).toEqual(['rankings-1']);
  });

  it('clears the exporting flag even when every graphic fails', async () => {
    mockToPng.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useGraphicExport());

    await act(async () => {
      await result.current.exportAll([request('a')]);
    });

    await waitFor(() => expect(result.current.isExporting).toBe(false));
  });

  it('does nothing for an empty pack', async () => {
    const { result } = renderHook(() => useGraphicExport());

    let outcome: { exported: number; failed: string[] } | undefined;
    await act(async () => {
      outcome = await result.current.exportAll([]);
    });

    expect(outcome).toEqual({ exported: 0, failed: [] });
    expect(mockToPng).not.toHaveBeenCalled();
  });
});
