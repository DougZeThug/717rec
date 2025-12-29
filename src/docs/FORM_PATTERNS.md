# Form Patterns Guide

## Required Pattern: react-hook-form + Zod + shadcn Form

All forms MUST use:
1. `react-hook-form` with `useForm` hook
2. `zodResolver` with Zod schema for validation
3. shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` components

## Form Done Checklist

Before considering a form complete, verify:

- [ ] Uses `useForm` with `zodResolver(schema)`
- [ ] All fields wrapped in `<FormField>` with proper `control` and `name`
- [ ] Each field has `<FormLabel>` (with required indicator if applicable)
- [ ] Each field wrapped in `<FormControl>`
- [ ] Each field has `<FormMessage />` for validation errors
- [ ] Submit button shows loading state with `disabled={isSubmitting}`
- [ ] Success feedback via toast notification
- [ ] Error feedback via toast notification (destructive variant)
- [ ] Form resets or closes on success

## Example Pattern (Gold Standard)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

const MyForm = ({ onSuccess, onCancel }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await saveData(data);
      toast({
        title: "Success",
        description: "Data saved successfully",
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save data",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

## Field Patterns

### Text Input
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Textarea
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Switch/Checkbox
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem className="flex items-center space-x-2">
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormLabel>Label</FormLabel>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Validation Patterns

### Common Schemas
```tsx
// Required string
z.string().min(1, "Field is required")

// Email
z.string().email("Invalid email address")

// Number with min/max
z.number().min(0, "Must be positive").max(100, "Max is 100")

// Optional field
z.string().optional()

// Optional with transform
z.string().optional().transform(val => val || null)

// Date
z.date()

// String to number transform
z.string().transform(val => parseInt(val, 10))
```

## Async Validation

For async validation (like checking username availability), use the form's `setError` method:

```tsx
const checkAvailability = async (value: string) => {
  const isAvailable = await checkIfAvailable(value);
  if (!isAvailable) {
    form.setError("username", {
      type: "manual",
      message: "Username is already taken",
    });
  }
};
```
