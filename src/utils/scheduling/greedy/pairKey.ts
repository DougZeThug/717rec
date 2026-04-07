/**
 * Generate canonical pairing key (sorted IDs)
 * Exported so callers can build forbiddenPairs sets
 */
export function pairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}||${idB}` : `${idB}||${idA}`;
}
