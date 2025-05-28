
/** slugify("Bean Queens") -> "bean_queens" (letters, numbers, _) */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')          // spaces -> underscore
    .replace(/[^a-z0-9_]/g, '')    // drop everything else
    .replace(/_+/g, '_');          // collapse repeats
}
