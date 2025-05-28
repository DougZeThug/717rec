
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { AlertCircle } from "lucide-react";
import { isValidUuidSafe } from "@/utils/uuidValidation";

interface BracketFormDivisionProps {
  form: UseFormReturn<BracketFormValues>;
  divisions: { id: string; name: string }[] | undefined;
  onDivisionChange: (divisionId: string) => void;
}

export const BracketFormDivision: React.FC<BracketFormDivisionProps> = ({ 
  form, 
  divisions, 
  onDivisionChange 
}) => {
  // Ensure divisions is an array and filter out invalid entries
  const validDivisions = Array.isArray(divisions) ? divisions.filter(division => 
    division && 
    division.id && 
    isValidUuidSafe(division.id) && 
    division.name && 
    typeof division.name === 'string'
  ) : [];
  
  const handleDivisionSelect = (value: string, field: any) => {
    console.log("Division selected:", value);
    
    // Handle empty/placeholder selections - prevent empty strings from being set
    if (!value || value === 'no-divisions' || value.trim() === '') {
      console.warn('Invalid division selection, not setting value:', value);
      return;
    }
    
    // Validate the selected value using our new validation
    if (!isValidUuidSafe(value)) {
      console.error('Invalid division ID format:', value);
      return;
    }
    
    // Verify the division exists in our valid list
    const selectedDivision = validDivisions.find(div => div.id === value);
    if (!selectedDivision) {
      console.error('Selected division not found in valid divisions:', value);
      return;
    }
    
    console.log('Setting division value:', value);
    field.onChange(value);
    onDivisionChange(value);
  };
  
  return (
    <FormField
      control={form.control}
      name="divisionId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Division<span className="text-red-500">*</span></FormLabel>
          <FormControl>
            <Select
              onValueChange={(value) => handleDivisionSelect(value, field)}
              value={field.value ?? ""} // Use nullish coalescing to handle undefined properly
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
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
          </FormControl>
          <FormMessage>
            {!field.value && (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle size={12} />
                <span>Division is required</span>
              </div>
            )}
          </FormMessage>
          {validDivisions.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No valid divisions found. Please contact an administrator.
            </p>
          )}
        </FormItem>
      )}
    />
  );
};
