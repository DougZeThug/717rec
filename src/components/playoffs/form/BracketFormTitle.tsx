import React from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { BracketFormValues } from './BracketFormSchema';

interface BracketFormTitleProps {
  form: UseFormReturn<BracketFormValues>;
}

export const BracketFormTitle: React.FC<BracketFormTitleProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bracket Title</FormLabel>
          <FormControl>
            <Input placeholder="Enter bracket title" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
