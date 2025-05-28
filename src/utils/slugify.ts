
/** slugify("Bean Queens") -> "bean-queens" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')         // spaces -> dash
    .replace(/[^a-z0-9-_]/g, '')  // drop invalid chars
    .replace(/-+/g, '-');         // collapse repeats
}
