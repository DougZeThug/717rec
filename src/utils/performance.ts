/**
 * Performance timing utility to measure async operation duration
 *
 * @example
 * const result = await withTiming(
 *   async () => fetchData(),
 *   (msg) => console.log(msg),
 *   'Data fetch'
 * );
 * // Logs: "Data fetch completed in 123.45ms"
 */
export const withTiming = async <T>(
  operation: () => Promise<T>,
  logger: (msg: string) => void,
  label: string
): Promise<T> => {
  const start = performance.now();
  const result = await operation();
  logger(`${label} completed in ${(performance.now() - start).toFixed(2)}ms`);
  return result;
};
