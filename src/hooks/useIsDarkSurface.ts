import { useTheme } from 'next-themes';

/**
 * Is the page a dark surface right now?
 *
 * Ask this instead of `resolvedTheme === 'dark'` whenever the answer decides a
 * colour. There are three themes, and two of them are dark: `dark` and
 * `winter-frozen`. Only `light` is a light surface, so the test is stated that
 * way round — a fourth theme that is dark gets the right answer for free, and a
 * fourth light theme is the only case that needs this line changed.
 *
 * This is not a substitute for a CSS token. Use `text-foreground` and friends
 * wherever a class will do; each theme already sets those to its own value.
 * This hook is for the places a class cannot reach — chart libraries that take
 * a colour string as a prop.
 *
 * `resolvedTheme` is one of the three named themes here, never `system`,
 * because `main.tsx` sets `enableSystem={false}`.
 */
export function useIsDarkSurface(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme !== 'light';
}
