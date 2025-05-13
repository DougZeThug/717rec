
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormDivisionProps {
  form: UseFormReturn<BracketFormValues>;
  divisions: { id: string; name: string }[] | undefined; // Make divisions possibly undefined
  onDivisionChange: (divisionId: string) => void;
}

export const BracketFormDivision: React.FC<BracketFormDivisionProps> = ({ form, divisions, onDivisionChange }) => {
  // Ensure divisions is an array
  const validDivisions = Array.isArray(divisions) ? divisions : [];
  
  return (
    <FormField
      control={form.control}
      name="divisionId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Division</FormLabel>
          <Select
            onValueChange={(value) => {
              field.onChange(value);
              onDivisionChange(value);
            }}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {validDivisions.length > 0 ? (
                validDivisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-divisions" disabled>
                  No divisions available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
