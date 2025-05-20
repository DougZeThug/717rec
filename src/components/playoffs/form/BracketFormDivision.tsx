
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { AlertCircle } from "lucide-react";

interface BracketFormDivisionProps {
  form: UseFormReturn<BracketFormValues>;
  divisions: { id: string; name: string }[] | undefined;
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
          <FormLabel>Division<span className="text-red-500">*</span></FormLabel>
          <FormControl>
            <Select
              onValueChange={(value) => {
                console.log("Division selected:", value);
                field.onChange(value);
                onDivisionChange(value);
              }}
              defaultValue={field.value}
              value={field.value}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                {validDivisions.length > 0 ? (
                  validDivisions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name || division.id}
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
        </FormItem>
      )}
    />
  );
};
