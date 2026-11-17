/**
 * A small seeded random source for tests. The same seed gives the same numbers on every
 * machine, so a night that fails can be replayed. It is not for anything that needs real
 * randomness.
 */
export const seededRandom = (seed: number): (() => number) => {
  const modulus = 4294967296;
  // Spread nearby seeds apart first, then step a simple linear generator.
  let state = (seed * 2654435761 + 12345) % modulus;
  const next = () => {
    state = (state * 1664525 + 1013904223) % modulus;
    return state / modulus;
  };
  for (let warmUp = 0; warmUp < 4; warmUp++) next();
  return next;
};
