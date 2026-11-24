import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge with one rule put back. From 3.7.1 on, a `text-<size>` class
 * that comes after a `leading-*` class no longer drops it, because in stock
 * Tailwind v4 the size sets a line height that `leading-*` overrides. This
 * project keeps v3's fixed line heights for `text-*` (see `src/index.css`), so a
 * size must win again, as it did in 3.7.0: `leading-none text-lg` is `text-lg`.
 * Pinned by `src/lib/__tests__/utils.test.ts`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    conflictingClassGroups: {
      'font-size': ['leading'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
