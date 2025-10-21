import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trophy } from "lucide-react";

export function BracketFormGrandFinal({ form }: { form: any }) {
  const format = form.watch("format");
  
  // Only show for Double Elimination
  if (format !== "Double Elimination") {
    return null;
  }

  return (
    <FormField
      control={form.control}
      name="grandFinalType"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <FormLabel>Grand Final Format</FormLabel>
          </div>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value || "simple"}
              className="flex flex-col space-y-1"
            >
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="simple" />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    Simple Grand Final
                  </FormLabel>
                  <FormDescription className="text-xs">
                    One match determines champion (faster, simpler)
                  </FormDescription>
                </div>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="double" />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    Double Grand Final (Bracket Reset)
                  </FormLabel>
                  <FormDescription className="text-xs">
                    If lower bracket champion wins first match, play second match (traditional fairness)
                  </FormDescription>
                </div>
              </FormItem>
            </RadioGroup>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
