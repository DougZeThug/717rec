
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSeasonMutations } from "@/hooks/useSeasonMutations";
import { toast } from "@/hooks/use-toast";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const seasonSchema = z.object({
  name: z.string().min(1, "Season name is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
});

type SeasonFormData = z.infer<typeof seasonSchema>;

interface SeasonFormProps {
  season?: any;
  onClose: () => void;
}

const SeasonForm: React.FC<SeasonFormProps> = ({ season, onClose }) => {
  const { createSeason, updateSeason } = useSeasonMutations();
  const isEditing = !!season;

  const form = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: season?.name || "",
      start_date: season?.start_date || "",
      end_date: season?.end_date || "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: SeasonFormData) => {
    try {
      if (isEditing) {
        const updateData = {
          id: season.id,
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date || null,
        };
        
        await updateSeason.mutateAsync(updateData);
        toast({
          title: "Success",
          description: "Season updated successfully",
        });
      } else {
        const createData = {
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date || null,
        };
        
        await createSeason.mutateAsync(createData);
        toast({
          title: "Success",
          description: "Season created successfully",
        });
      }
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save season",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{isEditing ? "Edit Season" : "Create New Season"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Season Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Spring 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Season
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Season
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SeasonForm;
