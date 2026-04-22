

## Plan: Wire up the Contact form honeypot field

### The bug

The Edge Function `send-support-email` checks a `website` honeypot field (bots auto-fill hidden inputs), but the frontend never sends it. So the honeypot can never trigger.

### The fix

Two small frontend changes — no backend changes needed.

**1. `src/services/support/ContactService.ts`**
Add the optional `website` field to `contactSchema` and to the `submitContactForm` payload so it's forwarded to the Edge Function:
```ts
website: z.string().optional(),
```
And include `website: data.website` in the body sent to `supabase.functions.invoke('send-support-email', ...)`.

**2. `src/pages/Contact.tsx`**
- Add `website: ''` to `defaultValues`.
- Add a hidden honeypot input registered with the form. Use the standard "off-screen + aria-hidden + tabIndex={-1} + autoComplete='off'" pattern so screen readers and keyboard users skip it but bots that parse the DOM and fill all inputs will populate it.

```tsx
<input
  type="text"
  tabIndex={-1}
  autoComplete="off"
  aria-hidden="true"
  className="absolute left-[-9999px] h-0 w-0 opacity-0"
  {...form.register('website')}
/>
```

### Test coverage

Add a test for `ContactService` confirming the schema accepts `website` and that `submitContactForm` forwards it. (If a test file doesn't exist, create `src/services/support/__tests__/ContactService.test.ts`.)

### Verification

1. `npm test` — new test passes.
2. Manual: open Contact page → DevTools → set the hidden `website` input value → submit → backend logs "Honeypot triggered" and the user still sees a success toast (silent reject by design).
3. Normal submissions (empty `website`) continue to send email as before.

### Rollback

Revert the two files and the new test. One step.

