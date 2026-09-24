import { useCallback, useState } from 'react';

import {
  RECAP_GRAPHIC_HEIGHT,
  RECAP_GRAPHIC_WIDTH,
} from '@/components/recap/graphics/recapGraphicTokens';
import { errorLog } from '@/utils/logger';

import { getFontEmbedCss } from './embedFonts';
import { awaitImagesDecoded } from './inlineImages';

/** A 1x1 transparent PNG, so a failed image leaves a gap rather than an icon. */
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export interface ExportRequest {
  node: HTMLElement;
  /** Without the .png extension. */
  fileName: string;
}

/**
 * Captures a designed element to a PNG in the admin's browser.
 *
 * html-to-image is imported dynamically and only from here. A static import
 * from anywhere a public page also reaches would let the bundler hoist it into a
 * shared chunk and eat the bundle budget that CI enforces.
 */
export const useGraphicExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const capture = useCallback(async (node: HTMLElement): Promise<string> => {
    // None of these three depend on each other, so they run together rather
    // than making the admin wait for them in turn.
    const [{ toPng }, fontEmbedCSS] = await Promise.all([
      import('html-to-image'),
      getFontEmbedCss(),
      document.fonts.ready,
    ]);
    await awaitImagesDecoded(node);

    return toPng(node, {
      width: RECAP_GRAPHIC_WIDTH,
      height: RECAP_GRAPHIC_HEIGHT,
      // EXPLICIT. html-to-image defaults to window.devicePixelRatio, so the
      // same button would produce 1080x1350 on one monitor and 2160x2700 on a
      // Retina laptop. The node is authored at final size, so 1x is already
      // crisp and matches the 4:5 target with no resampling.
      pixelRatio: 1,
      // Supplying this makes html-to-image skip its own stylesheet walk, which
      // is the step that silently drops self-hosted fonts.
      fontEmbedCSS,
      imagePlaceholder: TRANSPARENT_PIXEL,
      skipAutoScale: true,
    });
  }, []);

  const download = useCallback((dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  /**
   * Capture and download several graphics in order.
   *
   * Sequential with a gap: browsers throttle rapid consecutive downloads and
   * quietly drop the later ones.
   */
  const exportAll = useCallback(
    async (requests: ExportRequest[]): Promise<{ exported: number; failed: string[] }> => {
      setIsExporting(true);
      const failed: string[] = [];
      let exported = 0;

      try {
        for (const request of requests) {
          try {
            const dataUrl = await capture(request.node);
            download(dataUrl, request.fileName);
            exported += 1;
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (error) {
            errorLog('Recap export: a graphic failed to render', { file: request.fileName, error });
            failed.push(request.fileName);
          }
        }
      } finally {
        setIsExporting(false);
      }

      return { exported, failed };
    },
    [capture, download]
  );

  return { capture, download, exportAll, isExporting };
};
