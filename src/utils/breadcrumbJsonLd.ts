const BASE_URL = 'https://717rec.app';

export interface BreadcrumbCrumb {
  name: string;
  path: string;
}

/** Build a schema.org BreadcrumbList JSON-LD object for the given crumbs. */
export const buildBreadcrumbJsonLd = (crumbs: BreadcrumbCrumb[]): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: c.name,
    item: `${BASE_URL}${c.path}`,
  })),
});
