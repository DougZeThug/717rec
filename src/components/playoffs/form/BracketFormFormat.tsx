
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormFormatProps {
  form: UseFormReturn<BracketFormValues>;
}

export const BracketFormFormat: React.FC<BracketFormFormatProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="format"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tournament Format</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a format" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="Single Elimination">Single Elimination</SelectItem>
              <SelectItem value="Double Elimination">Double Elimination</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
