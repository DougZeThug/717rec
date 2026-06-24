## Goal

Clear the 17 remaining `react-refresh/only-export-components` warnings by splitting non-component exports (variants, constants, contexts, hooks) into sibling files. **Zero runtime behavior changes** — all public import paths stay valid via re-exports from the original file.

## Strategy

For each flagged file:
1. Move the non-component export(s) into a new sibling file.
2. Update the original component file to import from the sibling.
3. Re-export the moved symbols from the original file so existing imports (`@/components/ui/button` → `buttonVariants`) keep working. The re-export still trips the rule, so on the original file we add a targeted `// eslint-disable-next-line react-refresh/only-export-components` above the re-export line, OR — preferred — update consumer imports to the new path when it's a small blast radius.

For shadcn/ui files and context files, the standard pattern is: keep the component file pure, move siblings out, and migrate internal consumers to import from the new sibling. Where the symbol is consumed widely (e.g. `buttonVariants`, `badgeVariants`), we'll rewrite consumer imports rather than leave a re-export, so the warning is actually eliminated.

## Files & splits

| Source file | New sibling | Moves |
|---|---|---|
| `ui/button.tsx` | `ui/button-variants.ts` | `buttonVariants` cva |
| `ui/badge.tsx` | `ui/badge-variants.ts` | `badgeVariants` cva |
| `ui/toggle.tsx` | `ui/toggle-variants.ts` | `toggleVariants` cva |
| `ui/form.tsx` | `ui/form-context.tsx` + `ui/use-form-field.ts` | `FormFieldContext`, `FormItemContext`, `useFormField` |
| `ui/sidebar.tsx` | (sidebar-context.tsx exists) | move `SidebarProvider` consumers; relocate the `useSidebar` re-export and any constants leaking from `sidebar.tsx` |
| `ui/sidebar-context.tsx` | `ui/sidebar-constants.ts` | `SIDEBAR_*` constants + `useSidebar` hook stay in context file only if file exports just context+hook; otherwise move constants out |
| `ui/sidebar-menu.tsx` | `ui/sidebar-menu-variants.ts` | `sidebarMenuButtonVariants` cva |
| `ui/charts/ChartContainer.tsx` | `ui/charts/chart-context.ts` | `ChartContext`, `useChart` |
| `ui/charts/ChartTooltip.tsx` | `ui/charts/chart-utils.ts` | helper fns / constants |
| `ui/charts/ChartLegend.tsx` | `ui/charts/chart-utils.ts` (shared) | helper fns |
| `ui/saved-badge.tsx` | inline-only component; move any constant export to `saved-badge-constants.ts` |
| `contexts/AuthContext.tsx` | `contexts/auth-context.ts` + `hooks/useAuth.ts` | raw `AuthContext` + `useAuth` hook; file keeps `AuthProvider` only |
| `contexts/NavigationContext.tsx` | `contexts/navigation-context.ts` + `hooks/useNavigation.ts` | raw context + hook; file keeps `NavigationProvider` |

## Consumer updates

After each split I'll grep for the moved symbol and rewrite imports project-wide:
- `buttonVariants`, `badgeVariants`, `toggleVariants` → new `*-variants.ts` paths
- `useFormField` → `@/components/ui/use-form-field`
- `useChart` → `@/components/ui/charts/chart-context`
- `useAuth` → `@/hooks/useAuth` (this is the bigger blast radius — many files)
- `useNavigation` → `@/hooks/useNavigation`

Because `useAuth`/`useNavigation` are used widely, I'll do those migrations with a scripted sed pass and verify with `tsgo --noEmit` + `npm test`.

## Safety checks per batch

1. `npx tsgo --noEmit` after each file's split.
2. `npm test` after the auth/navigation context split (highest risk).
3. Final `npx eslint .` to confirm 0 warnings of this rule.

## Out of scope

- No logic changes inside any component, hook, or context.
- No styling/cva token changes — variants move verbatim.
- No new exports or API changes.

## Order of execution (lowest risk → highest)

1. `badge`, `button`, `toggle` variant splits (mechanical).
2. `charts/*` context + utils.
3. `form.tsx` context + hook.
4. `sidebar.tsx` / `sidebar-menu.tsx` / `sidebar-context.tsx` cleanup.
5. `saved-badge.tsx`.
6. `AuthContext` + `NavigationContext` (project-wide consumer rewrite, tested).
