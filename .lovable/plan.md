## Problem
Three files import `toast` from `sonner`, but sonner's `<Toaster />` is not mounted anywhere in the app — only the shadcn/ui Toaster is mounted in `src/App.tsx`. As a result these toasts silently never render:

- `src/hooks/contact/useContactRequests.ts` (3 `toast.error` calls)
- `src/hooks/notifications/useNotificationMutations.ts` (1 `toast.error` call)
- `src/components/admin/theme/ThemeManagementTab.tsx` (1 `toast.error` validation + success/error in mutation)

## Fix
Migrate all five sonner call sites to the already-mounted shadcn/ui toast system via `@/hooks/use-toast` (the existing app standard, used in 76+ files). No new dependency is mounted; no Toaster is added.

For each file:
1. Replace `import { toast } from 'sonner'` with `import { useToast } from '@/hooks/use-toast'`.
2. Inside the hook/component, call `const { toast } = useToast();`.
3. Rewrite calls:
   - `toast.error('msg')` → `toast({ title: 'msg', variant: 'destructive' })`
   - `toast.success('msg')` → `toast({ title: 'msg' })`

Because `useToast` is a hook, in `useContactRequests.ts` and `useNotificationMutations.ts` it must be called at the top of each custom hook (e.g. `useMarkContactRequestResolved`) and captured in a `toast` const used inside `onError`/`onSuccess`.

## Verification
- Run targeted tests: `npm run test:file -- src/hooks/contact` and `src/hooks/notifications` if present, plus any ThemeManagementTab tests.
- `npx tsc --noEmit` for type safety.
- Manually trigger one error path (e.g., delete a contact request while offline) and confirm a destructive toast renders.

## Out of scope
- Re-adding sonner's `<Toaster />` (alternative considered, rejected to keep a single toast system).
- Refactoring the 76+ existing shadcn toast call sites.
