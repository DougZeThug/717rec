
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormDivisionProps {
  form: UseFormReturn<BracketFormValues>;
  divisions: { id: string; name: string }[];
  onDivisionChange: (divisionId: string) => void;
}

export const BracketFormDivision: React.FC<BracketFormDivisionProps> = ({
  form,
  divisions,
  onDivisionChange,
}) => {
  const handleDivisionChange = (divisionId: string) => {
    const selectedDivision = divisions.find(d => d.id === divisionId);
    console.log("BracketFormDivision: Division changed to:", { divisionId, divisionName: selectedDivision?.name });
    
    // Set both division ID and name for easier filtering
    form.setValue('divisionId', divisionId);
    form.setValue('divisionName', selectedDivision?.name || '');
    
    onDivisionChange(divisionId);
  };

  return (
    <FormField
      control={form.control}
      name="divisionId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Division</FormLabel>
          <Select onValueChange={handleDivisionChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
