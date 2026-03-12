/**
 * Extends the Error constructor to support ErrorOptions (ES2022+).
 * @types/node overrides the built-in Error type without the options parameter.
 */
interface ErrorOptions {
  cause?: unknown;
}

interface ErrorConstructor {
  new (message?: string, options?: ErrorOptions): Error;
  (message?: string, options?: ErrorOptions): Error;
}
