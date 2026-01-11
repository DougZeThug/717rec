import React from 'react';
import { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorLog } from '@/utils/logger';

interface BracketFormDivisionProps {
  form: UseFormReturn<any>;
  divisions: { id: string; name: string; display_division?: string }[];
  onDivisionChange: (divisionId: string) => void;
}

/**
 * Get unique display divisions (Competitive, Intermediate, Recreational)
 * Filters out "Hidden" division and groups by display_division
 */
const getUniqueDisplayDivisions = (
  divisions: { id: string; name: string; display_division?: string }[]
) => {
  const displayDivisionMap = new Map<
    string,
    { id: string; name: string; display_division: string }
  >();

  divisions.forEach((div) => {
    const displayDiv = div.display_division || div.name;
    // Skip Hidden division
    if (displayDiv === 'Hidden') return;

    // Store the first division of each display group
    if (!displayDivisionMap.has(displayDiv)) {
      displayDivisionMap.set(displayDiv, {
        id: div.id,
        name: displayDiv,
        display_division: displayDiv,
      });
    }
  });

  return Array.from(displayDivisionMap.values());
};

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
      const selectedDivision = divisions.find((d) => d.id === divisionId);

      // Set the division ID in the form
      form.setValue('divisionId', divisionId);

      // Set division name if available for easier filtering
      if (selectedDivision?.name) {
        form.setValue('divisionName', selectedDivision.name);
      }

      // Call the parent handler
      onDivisionChange(divisionId);
    } catch (error) {
      errorLog('BracketFormDivision: Error handling division change:', error);
    }
  };

  // Get unique display divisions
  const uniqueDisplayDivisions = React.useMemo(
    () => getUniqueDisplayDivisions(divisions),
    [divisions]
  );

  // Show message if no divisions available
  if (
    !divisions ||
    !Array.isArray(divisions) ||
    divisions.length === 0 ||
    uniqueDisplayDivisions.length === 0
  ) {
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
              {uniqueDisplayDivisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.display_division}
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
