import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

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
const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const menuIds = (source: string) => {
  const list = source.slice(
    source.indexOf('const adminMenuItems'),
    source.indexOf('const tabGroups')
  );
  return [...list.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
};

const mobileSource = read('src/components/admin/dashboard/AdminMobileNav.tsx');
const desktopSource = read('src/components/admin/dashboard/AdminSidebar.tsx');

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
});
