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
  ResponsiveDialogClose,
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
          <ResponsiveDialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </ResponsiveDialogClose>
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

ResponsiveDialog uses a Drawer on mobile which:
- Takes up to 90% of viewport height
- Scrolls content within 80% viewport height
- Has built-in padding (px-4 pb-4)
- Supports swipe-to-dismiss

Ensure your modal content:
- Uses proper spacing (space-y-4 for vertical rhythm)
- Has reasonable max-heights for scrollable lists
- Doesn't have fixed heights that break on mobile
