
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormTitleProps {
  form: UseFormReturn<BracketFormValues>;
}

export const BracketFormTitle: React.FC<BracketFormTitleProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bracket Title</FormLabel>
          <FormControl>
            <Input placeholder="Enter bracket title" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
