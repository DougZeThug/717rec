
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { useDisplayDivisions } from "@/hooks/playoffs/useDisplayDivisions";

interface BracketFormDivisionProps {
  form: UseFormReturn<BracketFormValues>;
  divisions: { id: string; name: string; display_division?: string }[];
  onDivisionChange: (displayDivisionName: string) => void;
}

/**
 * Division selection component for bracket forms
 * Handles division selection and updates form state accordingly
 */
export const BracketFormDivision: React.FC<BracketFormDivisionProps> = ({
  form,
  divisions,
  onDivisionChange,
}) => {
  // Group divisions by display division
  const displayDivisions = useDisplayDivisions(divisions);

  /**
   * Handles display division selection change events
   * @param displayDivisionName - The selected display division name
   */
  const handleDivisionChange = (displayDivisionName: string) => {
    try {
      // Set the display division name in the form
      form.setValue('divisionId', displayDivisionName);
      form.setValue('divisionName', displayDivisionName);
      
      // Call the parent handler with display division name
      onDivisionChange(displayDivisionName);
    } catch (error) {
      console.error("BracketFormDivision: Error handling division change:", error);
    }
  };

  // Show message if no display divisions available
  if (!displayDivisions || displayDivisions.length === 0) {
    return (
      <FormField
        control={form.control}
        name="divisionId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Division</FormLabel>
            <FormControl>
              <div className="p-2 text-sm text-gray-500 border rounded">
                No divisions available. Please create divisions first.
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

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
              {displayDivisions.map((displayDiv) => (
                <SelectItem key={displayDiv.name} value={displayDiv.displayName}>
                  {displayDiv.displayName}
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
