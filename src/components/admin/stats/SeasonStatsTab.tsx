
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useTeamsData } from "@/hooks/useTeamsData";
import { Loader2, Save } from "lucide-react";

const formSchema = z.object({
  seasonId: z.string().min(2, {
    message: "Season ID must be at least 2 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const SeasonStatsTab = () => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { teams } = useTeamsData();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      seasonId: `Season ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
    },
  });

  const onSubmit = (values: FormValues) => {
    setIsConfirmDialogOpen(true);
  };

  const handleSnapshotConfirmed = async () => {
    const values = form.getValues();
    setIsConfirmDialogOpen(false);
    setIsSaving(true);

    try {
      // Check if entries for this season already exist
      const { data: existingEntries, error: checkError } = await supabase
        .from('season_stats')
        .select('team_id')
        .eq('season_id', values.seasonId);
      
      if (checkError) throw checkError;
      
      if (existingEntries && existingEntries.length > 0) {
        const existingTeams = existingEntries.map(entry => entry.team_id);
        
        toast({
          title: "Warning",
          description: `Entries for ${existingEntries.length} teams already exist for season "${values.seasonId}". Only new teams will be added.`,
          // Fix: Use 'default' instead of 'warning' as variant
          variant: "default",
        });

        // Fix: Create a filtered copy instead of modifying the original teams array
        const teamsToProcess = teams.filter(team => !existingTeams.includes(team.id));
        
        if (teamsToProcess.length === 0) {
          toast({
            title: "No Action Needed",
            description: "All teams already have stats recorded for this season.",
          });
          setIsSaving(false);
          return;
        }

        // Create entries for teams that don't have records yet
        const entries = teamsToProcess.map(team => ({
          season_id: values.seasonId,
          team_id: team.id,
          match_wins: team.wins || 0,
          match_losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          power_score: team.power_score || 0,
          sos: team.sos || 0,
        }));

        const { error } = await supabase
          .from('season_stats')
          .insert(entries);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Stats for ${entries.length} teams have been saved to season "${values.seasonId}".`,
        });
      } else {
        // No existing entries for this season, create for all teams
        const entries = teams.map(team => ({
          season_id: values.seasonId,
          team_id: team.id,
          match_wins: team.wins || 0,
          match_losses: team.losses || 0,
          game_wins: team.game_wins || 0,
          game_losses: team.game_losses || 0,
          power_score: team.power_score || 0,
          sos: team.sos || 0,
        }));

        const { error } = await supabase
          .from('season_stats')
          .insert(entries);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Stats for ${entries.length} teams have been saved to season "${values.seasonId}".`,
        });
      }
    } catch (error: any) {
      console.error("Error saving season stats:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save season stats. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Save Season Stats Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="seasonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season Identifier</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Spring 2025" />
                    </FormControl>
                    <FormDescription>
                      Enter a name to identify this season (e.g. "Spring 2025", "Fall League 2024")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={isSaving}
                className="flex gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Current Team Stats
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="bg-muted/50 flex flex-col items-start text-sm text-muted-foreground">
          <p>This will create a snapshot of the current stats for all teams.</p>
          <p>The original team data won't be modified or reset.</p>
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Current Stats Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              This will save the current stats for all teams with season ID "{form.getValues().seasonId}". 
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSnapshotConfirmed}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SeasonStatsTab;
