import React, { useState, useEffect } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import TeamSelectionList from "./TeamSelectionList";
import { Team } from "@/types";

// Define the form schema with zod
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  divisionId: z.string().min(1, "Division is required"),
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string()).min(2, "At least 2 teams are required"),
  useChallonge: z.boolean().optional(),
});

export type BracketFormValues = z.infer<typeof formSchema>;

interface BracketFormProps {
  divisions: { id: string; name: string }[];
  teams: Team[];
  isSubmitting: boolean;
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const BracketForm: React.FC<BracketFormProps> = ({
  divisions,
  teams,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [teamsByDivision, setTeamsByDivision] = useState<Record<string, Team[]>>({});
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  
  // Initialize the form
  const form = useForm<BracketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      divisionId: "",
      format: "Double Elimination",
      teams: [],
      useChallonge: true,
    },
  });
  
  // Group teams by division
  useEffect(() => {
    const grouped = teams.reduce((acc, team) => {
      if (team.division_id) {
        if (!acc[team.division_id]) {
          acc[team.division_id] = [];
        }
        acc[team.division_id].push(team);
      }
      return acc;
    }, {} as Record<string, Team[]>);
    
    setTeamsByDivision(grouped);
  }, [teams]);
  
  // Handle division change
  const handleDivisionChange = (divisionId: string) => {
    setSelectedDivision(divisionId);
    form.setValue("divisionId", divisionId);
    form.setValue("teams", []);
  };
  
  // Get filtered teams based on selected division
  const filteredTeams = selectedDivision ? teamsByDivision[selectedDivision] || [] : [];
  
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
                <Input placeholder="Enter bracket title" {...field} />
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
                onValueChange={(value) => handleDivisionChange(value)}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a division" />
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
              <FormLabel>Tournament Format</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a format" />
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
          name="useChallonge"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Use Challonge Integration</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Create tournament in Challonge for professional bracket visualization
                </p>
              </div>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="teams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Teams (Max 16)</FormLabel>
              <FormControl>
                <Card className="p-2 max-h-64 overflow-y-auto">
                  <TeamSelectionList
                    teams={filteredTeams}
                    selectedTeams={[]} // Add empty array as fallback
                    selectedTeamIds={field.value}
                    onTeamToggle={(teamId) => {}} // Add no-op function for compatibility
                    onChange={field.onChange}
                    maxTeams={16}
                  />
                </Card>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Bracket"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BracketForm;
