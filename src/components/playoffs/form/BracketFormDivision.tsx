
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

/**
 * Division selection component for bracket forms
 * Handles division selection and updates form state accordingly
 */
export const BracketFormDivision: React.FC<BracketFormDivisionProps> = ({
  form,
  divisions,
  onDivisionChange,
}) => {
  /**
   * Handles division selection change events
   * @param divisionId - The selected division ID
   */
  const handleDivisionChange = (divisionId: string) => {
    try {
      const selectedDivision = divisions.find(d => d.id === divisionId);
      
      // Set the division ID in the form
      form.setValue('divisionId', divisionId);
      
      // Set division name if available for easier filtering
      if (selectedDivision?.name) {
        form.setValue('divisionName', selectedDivision.name);
      }
      
      // Call the parent handler
      onDivisionChange(divisionId);
    } catch (error) {
      console.error("BracketFormDivision: Error handling division change:", error);
    }
  };

  // Show message if no divisions available
  if (!divisions || !Array.isArray(divisions) || divisions.length === 0) {
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
