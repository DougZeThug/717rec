/**
 * Exhaustiveness guard for switch statements over finite union types.
 *
 * TypeScript refuses to compile a call to this if any member of the union is
 * left unhandled, so an added union member becomes a build error rather than a
 * silent fallthrough. At runtime it throws, so unexpected data surfaces loudly.
 */
export const assertNever = (value: never, context = 'value'): never => {
  const detail: unknown = value;
  const description =
    typeof detail === 'object' && detail !== null ? JSON.stringify(detail) : String(detail);

  throw new Error(`Unhandled ${context}: ${description}`);
};
