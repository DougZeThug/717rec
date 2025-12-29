# Definition of Done

Every feature or bugfix must satisfy this checklist before it's considered "done".

## Quick Reference

| Scope | Required Checks |
|-------|-----------------|
| Bug Fix | Build passes, formatted, test for bug, error handling |
| Feature | Above + loading/empty/error states, unit tests, pattern compliance, keyboard accessible |
| Major Feature | Above + integration tests, docs updated, full a11y audit |

---

## 1. Code Quality

### Build & Lint
- [ ] No ESLint errors (`npm run lint`)
- [ ] No TypeScript compile errors (`npm run build` succeeds)
- [ ] No `@ts-ignore` or `@ts-expect-error` without justification comment
- [ ] No `any` types (use proper typing or `unknown`)

### Formatting
- [ ] Code formatted with Prettier (`npm run format` or auto-save)
- [ ] Imports sorted correctly (handled by ESLint plugin)

### Error Handling
- [ ] API calls wrapped in try/catch or use React Query error states
- [ ] Errors logged via `errorLog()` from `@/utils/logger`
- [ ] User-facing errors shown via toast or inline message
- [ ] No swallowed errors (no empty catch blocks)

### Console Output
- [ ] No `console.log` in production code
- [ ] Use `debugLog`, `errorLog`, `diagnosticLog` from logger utils

---

## 2. Testing

### When Tests Are Required

| Change Type | Test Requirement |
|-------------|------------------|
| Pure utility function | Unit test required |
| Complex business logic | Unit test required |
| Critical user flow | Integration test recommended |
| Bug fix | Test that reproduces the bug |
| UI component | Component test if complex logic |

### Test Standards
- [ ] Tests in `__tests__/` folder alongside source
- [ ] Naming: `ComponentName.test.tsx` or `utilName.test.ts`
- [ ] Uses Vitest + React Testing Library
- [ ] All tests pass: `npm run test`

### What to Test
- Rendering with different props
- User interactions (clicks, inputs)
- Loading/error/empty state handling
- Edge cases and boundaries

### Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

---

## 3. UI/UX State Handling

### Required States for Data-Fetching Components
- [ ] **Loading**: Use `<LoadingState />` component
- [ ] **Empty**: Use `<EmptyState />` with icon, message, and CTA
- [ ] **Error**: User-friendly message with retry option

### Pattern Compliance
- [ ] Cards follow `src/docs/CARD_PATTERNS.md`
- [ ] Forms follow `src/docs/FORM_PATTERNS.md`
- [ ] Modals follow `src/docs/MODAL_PATTERNS.md`
- [ ] Uses design system tokens (no hardcoded colors)

---

## 4. Accessibility

### Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Buttons use `<button>` element
- [ ] Links use `<a>` or `<Link>` component
- [ ] Lists use `<ul>/<ol>` with `<li>`

### Interactive Elements
- [ ] All buttons/links have accessible labels
- [ ] Icons have `aria-label` or visible text
- [ ] Form inputs have `<Label>` components
- [ ] Error messages linked via `aria-describedby`

### Keyboard Navigation
- [ ] All interactive elements focusable via Tab
- [ ] Focus order matches visual order
- [ ] Modals trap focus (Radix handles this)
- [ ] Escape closes modals/dialogs
- [ ] Enter/Space activates buttons

### Visual
- [ ] Sufficient color contrast (use theme tokens)
- [ ] Focus indicators visible
- [ ] No info conveyed by color alone

---

## 5. Documentation

### When Required
- [ ] New environment variable → Add to README
- [ ] New feature folder → Follow `FOLDER_CONVENTIONS.md`
- [ ] Breaking change → Document migration steps
- [ ] Deprecated code → Add `@deprecated` JSDoc

### Code Documentation
- [ ] Complex functions have JSDoc comments
- [ ] Non-obvious logic has inline comments
- [ ] Public interfaces documented

---

## Checklists by Scope

### Bug Fix (Minimum)

```
[ ] Builds without errors
[ ] Formatted with Prettier
[ ] Test covering the bug
[ ] Error handling in place
```

### Standard Feature

```
[ ] All bug fix items
[ ] Loading/empty/error states
[ ] Unit tests for logic
[ ] Follows pattern docs
[ ] Keyboard accessible
```

### Major Feature

```
[ ] All standard items
[ ] Integration tests
[ ] Documentation updated
[ ] Full accessibility audit
[ ] Code review completed
```

---

## Related Docs

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [FOLDER_CONVENTIONS.md](./FOLDER_CONVENTIONS.md) - Folder structure
- [FORM_PATTERNS.md](./FORM_PATTERNS.md) - Form patterns
- [CARD_PATTERNS.md](./CARD_PATTERNS.md) - Card patterns
- [MODAL_PATTERNS.md](./MODAL_PATTERNS.md) - Modal patterns
