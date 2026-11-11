# Modal/Dialog Patterns Guide

## Component Selection

### Use ResponsiveDialog for:
- Any dialog with form content
- Any dialog with lists or complex content
- Any dialog that users will interact with on mobile

ResponsiveDialog automatically:
- Shows as centered Dialog on desktop
- Shows as bottom Drawer on mobile (swipe to dismiss)
- Provides better touch targets and scrolling on mobile
- Caps desktop dialogs at 90% of the screen height and scrolls them when content is taller

### Use AlertDialog for:
- Confirmation dialogs (delete, archive, etc.)
- Simple yes/no decisions
- Short content that fits on mobile screens

### Use Sheet for:
- Side panels (navigation, settings)
- Content that slides in from edge

## ResponsiveDialog Pattern

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";

const MyModal = ({ open, onOpenChange }) => {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Modal Title</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Description of what this modal does.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Modal content goes here */}
        <div className="space-y-4">
          {/* Form fields, lists, etc. */}
        </div>

        <ResponsiveDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button>Save</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
```

## ResponsiveDialog with Form

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(1, "Required"),
});

const FormModal = ({ open, onOpenChange }) => {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data) => {
    await saveData(data);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add Item</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Fill in the details below.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
```

## AlertDialog Pattern

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DeleteConfirmation = ({ open, onOpenChange, onConfirm }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Item?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

## Migration Guide: Dialog to ResponsiveDialog

When migrating from Dialog to ResponsiveDialog:

```tsx
// Before
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      {/* buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>

// After
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";

<ResponsiveDialog open={open} onOpenChange={onOpenChange}>
  <ResponsiveDialogContent>
    <ResponsiveDialogHeader>
      <ResponsiveDialogTitle>Title</ResponsiveDialogTitle>
      <ResponsiveDialogDescription>Description</ResponsiveDialogDescription>
    </ResponsiveDialogHeader>
    {/* content */}
    <ResponsiveDialogFooter>
      {/* buttons */}
    </ResponsiveDialogFooter>
  </ResponsiveDialogContent>
</ResponsiveDialog>
```

The migration is mostly a 1:1 replacement of component names.

## Mobile Considerations

### A plain Dialog or AlertDialog on a phone

`DialogContent` and `AlertDialogContent` stay centred boxes on a phone. Both:

- keep a 16px gap each side (`w-[calc(100%-2rem)]`; `max-w-lg` still sets the
  desktop width) and have round corners at every size;
- are never taller than the screen minus 32px and scroll inside when the content
  is taller (`max-h-[calc(100dvh-2rem)] overflow-y-auto`).

To set your own height limit, pass a plain `max-h-[...]` class, for example
`max-h-[90vh] supports-[height:90dvh]:max-h-[90dvh]`. tailwind-merge then drops
the shared cap. The shared cap is `dvh` only, with no `vh` fallback, on purpose:
a `supports-[...]` class is a different group to tailwind-merge, so a fallback
pair in the shared class would stay next to yours.

The 16px gap leaves 240px for content on a 320px phone (`p-6` takes 48px). A row
that cannot wrap (buttons side by side, an icon-date-place line) scrolls the
pop-up sideways there. Give such a row `flex-wrap`, or stack it below `sm`.

`DialogContent` is a CSS grid with no column set, so its one track grows to the
widest child's min-content width. A `truncate` or `whitespace-nowrap` child
(a long team name, a `min-w-[...]` card) then makes the whole pop-up scroll
sideways. Pass `grid-cols-1` (a `minmax(0,1fr)` track) on that DialogContent.
Examples: `SeedingUpdateDialog` and `BracketCreationDialog`.

A text field inside a pop-up must be at least 16px on a phone
(`text-base md:text-sm`), or iPhone Safari zooms in when it gets focus. `Input`,
`Textarea` and `CommandInput` already do this; do not override them with
`text-sm` or `text-xs`.

### Named exceptions: long pop-ups that stay centred on a phone

The house rule is that a long form becomes a bottom sheet (`ResponsiveDialog`) on
a phone. Two pop-ups stay centred on purpose (Doug, 2026-11-10):

- **The playoff score pop-up** (`BracketsManagerMatchEditor` with
  `RegularMatchEditor` and `ByeMatchEditor`). It holds two score boxes, not a long
  form. It guards typed scores instead: `useMatchEditorState` gives `isDirty`
  (open, and the typed score differs from the stored one) and one
  `handleOpenChange` that runs `useUnsavedChangesGuard` for a tap outside,
  Escape and Cancel. Save closes without asking. Closing clears the draft,
  because the editor stays mounted and would otherwise reopen the same match with
  the thrown-away scores.
- **Create Bracket** (`BracketCreationDialog`). A swipe on a bottom sheet would
  fight the drag-to-seed list.

Edit Bracket, Move team and Edit teams also stay centred: each is a one or
two-field picker that fits at 320px.

### ResponsiveDialog on a phone

ResponsiveDialog uses a Drawer on mobile which:
- Takes up to 90% of viewport height
- Scrolls content within 80% viewport height
- Has built-in padding (px-4 pb-4)
- Supports swipe-to-dismiss

Do not count on a confirm in `onOpenChange` to stop a swipe from throwing typed
input away. Turn the swipe off instead: a sheet that holds typed input passes
`dismissible={!isDirty && !isSubmitting}`. A swipe then closes it only while
nothing is typed and nothing is saving. With `dismissible` false, vaul also
ignores Escape and a tap outside, so only your own buttons close the sheet.
Keep the unsaved-changes guard in `onOpenChange` too: Cancel calls it, and on
desktop Escape and a click outside call it. Examples: `EditRoundDialog` (Live Corrections) and
`ScoreSubmissionModal` (it passes `dismissible={!isSubmitting}`, because it
resets its form on close).

A long form with no dirty flag can pass `dismissible={false}` always. Example:
`EditTeamDialog` (admin Teams, Edit Team). On a phone it is a bottom sheet that
only its own Cancel or Update Team button closes, so a stray swipe while scrolling
the form cannot throw the edits away. On desktop it is the centred pop-up, and
Escape and a click outside still close it with no question.

Ensure your modal content:
- Uses proper spacing (space-y-4 for vertical rhythm)
- Has reasonable max-heights for scrollable lists
- Doesn't have fixed heights that break on mobile
