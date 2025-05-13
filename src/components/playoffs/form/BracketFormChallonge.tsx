
import React from "react";
import { FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormChallongeProps {
  form: UseFormReturn<BracketFormValues>;
}

export const BracketFormChallonge: React.FC<BracketFormChallongeProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="useChallonge"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Use Challonge Integration</FormLabel>
            <p className="text-sm text-muted-foreground">
              Create tournament in Challonge for professional bracket visualization
            </p>
          </div>
        </FormItem>
      )}
    />
  );
};
