
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { BRACKET_FORMATS } from "@/constants/brackets";

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
              <SelectItem value={BRACKET_FORMATS.SINGLE}>{BRACKET_FORMATS.SINGLE}</SelectItem>
              <SelectItem value={BRACKET_FORMATS.DOUBLE}>{BRACKET_FORMATS.DOUBLE}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
