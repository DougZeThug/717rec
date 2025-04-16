
import React, { useMemo } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Team } from "@/types";
import TeamSelectionList from "./TeamSelectionList";

// Validation schema for the bracket creation form
const bracketFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  divisionId: z.string().min(1, { message: "Please select a division." }),
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string()).min(2, { message: "Select at least 2 teams." }),
});

export type BracketFormValues = z.infer<typeof bracketFormSchema>;

interface BracketFormProps {
  divisions: { id: string; name: string }[];
  teams: Team[];
  isSubmitting: boolean;
  onSubmit: (data: BracketFormValues) => void;
  onCancel: () => void;
}

const BracketForm: React.FC<BracketFormProps> = ({
  divisions,
  teams,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(bracketFormSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: "Single Elimination",
      teams: [],
    },
  });
  
  // Filter teams based on selected division
  const selectedDivisionId = form.watch("divisionId");
  const filteredTeams = useMemo(() => {
    if (!selectedDivisionId) return [];
    return teams.filter(team => team.division === selectedDivisionId);
  }, [selectedDivisionId, teams]);

  // Toggle team selection
  const toggleTeamSelection = (teamId: string) => {
    const currentTeams = form.watch("teams");
    if (currentTeams.includes(teamId)) {
      form.setValue("teams", currentTeams.filter(id => id !== teamId));
    } else {
      form.setValue("teams", [...currentTeams, teamId]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bracket Title</FormLabel>
              <FormControl>
                <Input placeholder="Playoff Final 2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="divisionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Division</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
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
        
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bracket Format</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Single Elimination">Single Elimination</SelectItem>
                  <SelectItem value="Double Elimination">Double Elimination</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="teams"
          render={() => (
            <FormItem>
              <FormLabel>Select Teams</FormLabel>
              {selectedDivisionId ? (
                <TeamSelectionList 
                  teams={filteredTeams}
                  selectedTeams={form.watch("teams")}
                  onTeamToggle={toggleTeamSelection}
                />
              ) : (
                <div className="border rounded-md p-2 h-[200px] overflow-y-auto">
                  <p className="text-center py-4 text-gray-500">
                    Please select a division first
                  </p>
                </div>
              )}
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Bracket
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BracketForm;
