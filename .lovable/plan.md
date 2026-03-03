

## Make Mobile Admin Groups Collapsible (Start Collapsed)

The groups are currently static divs — always expanded, no toggle. We need to make each group header clickable to expand/collapse its tab list, starting collapsed by default.

**Approach**: Use simple React state (`useState`) to track which groups are open, instead of Radix Accordion (which caused the original overflow clipping bug). Each group header becomes a clickable button with a chevron indicator. The tab list inside conditionally renders based on open state. All groups start collapsed.

| File | Change |
|---|---|
| `AdminMobileNav.tsx` | Add `openGroups` state (`useState<Set<string>>(new Set())`). Make each group header a `<button>` that toggles its group in the set. Wrap the tab list div in a conditional `{openGroups.has(group.id) && (...)}`. Add a `ChevronDown` icon that rotates when open. Auto-open the group containing the active tab. |

This avoids Radix Accordion entirely — no `overflow-hidden`, no height animation CSS variables, no clipping risk.

