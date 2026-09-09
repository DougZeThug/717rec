import { describe, expect, it } from 'vitest';

import { ADMIN_SECTION_GROUPS, ADMIN_SECTIONS } from '@/components/admin/dashboard/adminSections';
import { adminSectionGuide } from '@/components/admin/help/adminSectionGuide';

/**
 * The sidebar and the phone menu used to keep their own hardcoded copies of the
 * menu, which is how the Notifications section once shipped desktop-only and how
 * the Hero section ended up with two names. Both read `ADMIN_SECTIONS` now, so
 * that particular drift is impossible and the old source-scraping comparison is
 * gone with it. What is still worth guarding lives below: the phone grouping,
 * the Help section's list, and the shape of an id now that it is part of a URL.
 */
describe('admin section registry', () => {
  it('puts every section in exactly one phone menu group', () => {
    const grouped = ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);

    const ungrouped = ADMIN_SECTIONS.map((section) => section.id).filter(
      (id) => !grouped.includes(id)
    );
    expect(ungrouped).toEqual([]);

    // A section in two groups would appear twice in the phone menu.
    const duplicated = grouped.filter((id, index) => grouped.indexOf(id) !== index);
    expect(duplicated).toEqual([]);

    // A group naming a section that no longer exists renders an empty row.
    const unknown = grouped.filter((id) => !ADMIN_SECTIONS.some((section) => section.id === id));
    expect(unknown).toEqual([]);
  });

  // The Help section shipped documenting 10 of the 21 sections, so an admin
  // reading it could not learn what half the dashboard did. It now lists every
  // section, and this keeps it that way: a new section must be described before
  // the suite goes green.
  it('describes every section in the Help section, under the same name', () => {
    expect(ADMIN_SECTIONS.length).toBeGreaterThan(10);
    expect(adminSectionGuide.map((section) => section.id)).toEqual(
      ADMIN_SECTIONS.map((section) => section.id)
    );
    expect(adminSectionGuide.map((section) => section.label)).toEqual(
      ADMIN_SECTIONS.map((section) => section.label)
    );
  });

  // Section ids are the last segment of /admin/<section>, so they have to stay
  // typeable and safe to put in an address.
  it('gives every section a unique, address-safe id', () => {
    const ids = ADMIN_SECTIONS.map((section) => section.id);

    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    expect(ids.filter((id) => !/^[a-z0-9-]+$/.test(id))).toEqual([]);
  });
});
