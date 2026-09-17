import { warnLog } from '@/utils/logger';

/**
 * Turns team logo URLs into data URLs before a graphic is captured.
 *
 * Logos live in Supabase Storage, so they are cross-origin. Two things go wrong
 * if they are left as URLs:
 *
 *   1. A cross-origin image taints the canvas and the capture throws.
 *   2. Worse and more common: the same URL is already in the HTTP cache from a
 *      plain <img> elsewhere in the app, which sets no crossOrigin. A later
 *      request WITH crossOrigin can be served that cached, header-less response
 *      and taints the canvas anyway.
 *
 * `cache: 'reload'` sidesteps the poisoned cache entry. A logo that still fails
 * resolves to null, and the graphic draws that team's initials instead — one
 * bad image must not fail a whole pack.
 */

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });

export type LogoResolver = (url: string | null) => string | null;

/**
 * Fetch every URL once and return a resolver the graphics can call.
 *
 * Deduplicated, so ten division graphics sharing a logo fetch it once.
 */
export const buildLogoResolver = async (urls: Array<string | null>): Promise<LogoResolver> => {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];

  const entries = await Promise.all(
    unique.map(async (url): Promise<[string, string | null]> => {
      // Already inline; nothing to fetch.
      if (url.startsWith('data:')) return [url, url];

      try {
        const response = await fetch(url, { mode: 'cors', cache: 'reload' });
        if (!response.ok) return [url, null];
        return [url, await toDataUrl(await response.blob())];
      } catch (error) {
        warnLog('Recap export: could not inline a team logo', { url, error });
        return [url, null];
      }
    })
  );

  const byUrl = new Map(entries);
  return (url) => (url ? (byUrl.get(url) ?? null) : null);
};

/**
 * Wait for every image inside a node to finish decoding.
 *
 * This is what removes the need for the well-known "call toPng twice and throw
 * the first away" workaround: after this resolves there is nothing left to load,
 * so the first capture is already complete.
 */
export const awaitImagesDecoded = async (node: HTMLElement): Promise<void> => {
  const images = [...node.querySelectorAll('img')];
  await Promise.all(
    images.map(async (img) => {
      try {
        await img.decode();
      } catch {
        // A broken image should not block the capture; it just draws as broken.
      }
    })
  );
};
