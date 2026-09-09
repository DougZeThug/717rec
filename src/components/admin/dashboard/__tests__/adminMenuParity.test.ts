import { describe, expect, it } from 'vitest';

// Read as text through Vite rather than the filesystem: a static import needs no
// working directory, so the test does not care where vitest was started from.
import mobileSource from '@/components/admin/dashboard/AdminMobileNav.tsx?raw';
import desktopSource from '@/components/admin/dashboard/AdminSidebar.tsx?raw';
import { adminSectionGuide } from '@/components/admin/help/adminSectionGuide';

/**
 * The desktop sidebar and the mobile nav each keep their own hardcoded menu
 * list. Adding a section to one and not the other makes it unreachable on that
 * device — exactly how the Notifications tab shipped desktop-only. These tests
 * read both files so the next addition cannot drift the same way.
 *
 * Both lists are module-private, so the ids are read from the source rather
 * than imported. Exporting them only for a test would widen the public surface
 * of two components for no runtime purpose.
 */
const menuSlice = (source: string) =>
  source.slice(source.indexOf('const adminMenuItems'), source.indexOf('const tabGroups'));

const menuLabels = (source: string) =>
  [...menuSlice(source).matchAll(/label:\s*'([^']+)'/g)].map((match) => match[1]);

const menuIds = (source: string) =>
  [...menuSlice(source).matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);

describe('admin menu parity', () => {
  it('offers every desktop sidebar section in the mobile nav', () => {
    const desktopIds = menuIds(desktopSource);
    const mobileIds = menuIds(mobileSource);

    expect(desktopIds.length).toBeGreaterThan(10);
    expect(mobileIds).toEqual(desktopIds);
  });

  it('puts every mobile menu item in exactly one tab group', () => {
    const mobileIds = menuIds(mobileSource);

    const groups = mobileSource.slice(mobileSource.indexOf('const tabGroups'));
    const grouped = [...groups.matchAll(/tabs:\s*\[([^\]]*)\]/g)].flatMap((match) =>
      [...match[1].matchAll(/'([^']+)'/g)].map((tab) => tab[1])
    );

    const ungrouped = mobileIds.filter((id) => !grouped.includes(id));
    expect(ungrouped).toEqual([]);

    // A section in two groups would appear twice in the bottom bar.
    const duplicated = grouped.filter((id, i) => grouped.indexOf(id) !== i);
    expect(duplicated).toEqual([]);
  });

  // The Help section shipped documenting 10 of the 21 sections, so an admin
  // reading it could not learn what half the dashboard did. It now lists every
  // section, and this keeps it that way: a new section must be described before
  // the suite goes green.
  it('describes every sidebar section in the Help section, under the same name', () => {
    expect(adminSectionGuide.map((section) => section.id)).toEqual(menuIds(desktopSource));
    expect(adminSectionGuide.map((section) => section.label)).toEqual(menuLabels(desktopSource));
  });
});
