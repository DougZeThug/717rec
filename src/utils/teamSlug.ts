/**
 * Converts a team name to a URL-friendly slug.
 * Examples:
 *   "Came from Dicks"    -> "came-from-dicks"
 *   "Baggin' & Braggin'" -> "baggin-braggin"
 *   "3 Amigos"           -> "3-amigos"
 *   "T-Baggers"          -> "t-baggers"
 *   "Smacked "           -> "smacked"
 */
export function toTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, '') // strip apostrophes
    .replace(/&/g, '') // strip ampersands
    .replace(/[^a-z0-9\s-]/g, '') // strip remaining special chars
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}

/**
 * Checks if a string matches UUID v4 format.
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
