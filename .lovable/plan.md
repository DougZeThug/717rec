

## Two Fixes

### Issue 1: Blind Draw Tab Disappearing on Mobile

**Root cause**: The Radix Accordion's `AccordionContent` component uses `overflow-hidden` permanently and animates height using `--radix-accordion-content-height`. This CSS variable is calculated once when the accordion opens. If the content inside hasn't fully rendered yet (due to React.memo, paint timing, font loading, etc.), the calculated height is too short and the last items in the group (blind draw, help) get clipped — permanently hidden by `overflow-hidden`. On refresh, timing varies, which is why it's intermittent.

**Fix**: Replace the accordion-based mobile nav with a simple always-visible grouped list. Each group shows its label as a header with its items directly below — no expand/collapse. This guarantees every tab is always visible. The groups are small (3-4 items each) so there's no need to hide them behind accordions on mobile.

| File | Change |
|---|---|
| `AdminMobileNav.tsx` | Replace the `Accordion` section with a simple grouped list — each group renders a header label followed by its tab buttons. Remove the `Accordion` import and related Radix components. Keep search and quick access as-is. |

### Issue 2: Hardcoded "See you Thursday!" Toast

**Root cause**: The confirmation message is hardcoded in `BlindDrawSignupForm.tsx` and `useBlindDrawSignups.ts`.

**Fix**: Add a `blind_draw_settings` table to store configurable settings including the signup confirmation message. Add a settings section to the admin Blind Draw tab so admins can edit the message. Update the signup flow to fetch and display the custom message.

| Step | Detail |
|---|---|
| Migration | Create `blind_draw_settings` table with `id`, `signup_confirmation_message` (text, default "You're signed up! See you there!"), `created_at`, `updated_at`. Single-row config pattern. Public SELECT, admin-only UPDATE via RLS. Seed with one default row. |
| New hook | `useBlindDrawSettings` — fetches the current confirmation message, plus a mutation to update it (admin only). |
| Update `BlindDrawSignupsTab` | Add a "Settings" card at the top with an editable text input for the confirmation message and a Save button. |
| Update `BlindDrawSignupForm.tsx` | Fetch the custom message via the new hook and use it in the success toast instead of the hardcoded text. |
| Update `useBlindDrawSignups.ts` | Remove the hardcoded toast message from the mutation; let the form component handle it with the dynamic message. |

