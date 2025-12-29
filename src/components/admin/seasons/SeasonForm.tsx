
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSeasonMutations } from "@/hooks/useSeasonMutations";
import { toast } from "@/hooks/use-toast";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
    defaultValues: {
      name: season?.name || "",
      start_date: season?.start_date || "",
      end_date: season?.end_date || "",
    },
  });

  const onSubmit = async (data: SeasonFormData) => {
    try {
      if (isEditing) {
        // Explicitly type the update data with all required fields
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
        // Explicitly type the create data with all required fields
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Season Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Spring 2025"
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                className="h-11"
                {...register("start_date")}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                className="h-11"
                {...register("end_date")}
              />
              {errors.end_date && (
                <p className="text-sm text-destructive mt-1">{errors.end_date.message}</p>
              )}
            </div>
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
      </CardContent>
    </Card>
  );
};

export default SeasonForm;
