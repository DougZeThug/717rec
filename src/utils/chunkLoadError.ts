/**
 * Whether an error means "the browser could not download this page's code".
 *
 * Every page in the app is a separate download fetched on first visit, so a
 * connection that drops between visits produces this rather than an ordinary
 * failure. It is not a bug in the page: the page never ran.
 *
 * Vite words it three ways depending on the browser. The fourth pattern and the
 * `ChunkLoadError` name are the older bundler's wording, kept because the
 * hosting service's cached shell can still be serving an earlier build.
 */
const CHUNK_LOAD_MESSAGES =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk \S+ failed/i;

export const isChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'ChunkLoadError') return true;
  return CHUNK_LOAD_MESSAGES.test(error.message);
};
