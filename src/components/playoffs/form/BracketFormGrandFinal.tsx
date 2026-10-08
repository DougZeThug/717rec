import { Trophy } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import type { BracketFormValues } from './BracketFormSchema';

function GrandFinalOption({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <FormItem className="flex items-center space-x-3 space-y-0">
      <FormControl>
        <RadioGroupItem value={value} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="font-normal">{label}</FormLabel>
        <FormDescription className="text-xs">{description}</FormDescription>
      </div>
    </FormItem>
  );
}

export function BracketFormGrandFinal({ form }: { form: UseFormReturn<BracketFormValues> }) {
  const format = form.watch('format');

  // Only show for Double Elimination
  if (format !== 'Double Elimination') {
    return null;
  }

  return (
    <FormField
      control={form.control}
      name="grandFinalType"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4" />
            <FormLabel>Grand Final Format</FormLabel>
          </div>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value || 'simple'}
              className="flex flex-col space-y-1"
            >
              <GrandFinalOption
                value="simple"
                label="Simple Grand Final"
                description="One match determines champion (faster, simpler)"
              />
              <GrandFinalOption
                value="double"
                label="Double Grand Final (Bracket Reset)"
                description="If lower bracket champion wins first match, play second match (traditional fairness)"
              />
            </RadioGroup>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
