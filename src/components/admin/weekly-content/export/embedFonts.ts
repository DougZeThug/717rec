/**
 * Builds the @font-face CSS that gets baked into an exported PNG.
 *
 * Without this the capture silently falls back to Arial. That failure is easy
 * to miss — the image still looks broadly right — so the fonts are fetched,
 * base64-encoded and handed to html-to-image as `fontEmbedCSS`, which also makes
 * it skip its own stylesheet walk.
 *
 * Only the four families the graphics use are embedded. The seasonal display
 * faces (OhSnow, SnowtopCaps) are .ttf/.otf, unused here, and would add weight
 * for nothing.
 */

interface EmbeddedFont {
  family: string;
  url: string;
  weight: string;
  style: string;
}

const FONTS: EmbeddedFont[] = [
  { family: 'Bebas Neue', url: '/fonts/bebas-neue-400.woff2', weight: '400', style: 'normal' },
  { family: 'Inter', url: '/fonts/inter-var.woff2', weight: '100 900', style: 'normal' },
  { family: 'Oswald', url: '/fonts/oswald-var.woff2', weight: '200 700', style: 'normal' },
  {
    family: 'IBM Plex Mono',
    url: '/fonts/ibm-plex-mono-400.woff2',
    weight: '400',
    style: 'normal',
  },
  {
    family: 'IBM Plex Mono',
    url: '/fonts/ibm-plex-mono-600.woff2',
    weight: '600',
    style: 'normal',
  },
];

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked so a large font cannot blow the argument limit of String.fromCharCode.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

let cached: Promise<string> | null = null;

const buildFontEmbedCss = async (): Promise<string> => {
  const faces = await Promise.all(
    FONTS.map(async (font) => {
      try {
        const response = await fetch(font.url);
        if (!response.ok) return '';
        const data = toBase64(await response.arrayBuffer());

        // Declared as plain woff2 rather than woff2-variations. A variable
        // woff2 IS a valid woff2, and some inliners mis-parse the variations
        // form and drop the face entirely.
        return [
          '@font-face {',
          `  font-family: '${font.family}';`,
          `  font-style: ${font.style};`,
          `  font-weight: ${font.weight};`,
          '  font-display: block;',
          `  src: url(data:font/woff2;base64,${data}) format('woff2');`,
          '}',
        ].join('\n');
      } catch {
        // A font that cannot be fetched costs that family its styling, not the
        // whole export.
        return '';
      }
    })
  );

  return faces.filter(Boolean).join('\n\n');
};

/**
 * The embed CSS, built once per session. Roughly 100 KB of base64, and every
 * graphic in a pack uses the same string.
 */
export const getFontEmbedCss = (): Promise<string> => {
  cached ??= buildFontEmbedCss();
  return cached;
};
