
import React, { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
import { BracketService } from "@/services/BracketService";
import { useToast } from "@/components/ui/use-toast";

// Validation schema for the bracket creation form
const bracketFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  divisionId: z.string().min(1, { message: "Please select a division." }),
  format: z.enum(["Single Elimination", "Double Elimination"]),
  teams: z.array(z.string()).min(2, { message: "Select at least 2 teams." }),
});

type BracketFormValues = z.infer<typeof bracketFormSchema>;

interface BracketCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisions: { id: string; name: string }[];
  teams: Team[];
  onBracketCreated: () => void;
}

const BracketCreationDialog: React.FC<BracketCreationDialogProps> = ({
  open,
  onOpenChange,
  divisions,
  teams,
  onBracketCreated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
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

  // Check if a team is already selected
  const isTeamSelected = (teamId: string) => {
    return form.watch("teams").includes(teamId);
  };

  // Toggle team selection
  const toggleTeamSelection = (teamId: string) => {
    const currentTeams = form.watch("teams");
    if (currentTeams.includes(teamId)) {
      form.setValue("teams", currentTeams.filter(id => id !== teamId));
    } else {
      form.setValue("teams", [...currentTeams, teamId]);
    }
  };

  const handleSubmit = async (data: BracketFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create bracket using the BracketService
      await BracketService.createBracket({
        title: data.title,
        divisionId: data.divisionId,
        format: data.format as "Single Elimination" | "Double Elimination",
        teamIds: data.teams,
      });
      
      toast({
        title: "Bracket Created",
        description: `${data.title} bracket has been successfully created.`,
      });
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Trigger refresh of brackets
      onBracketCreated();
    } catch (error) {
      console.error("Error creating bracket:", error);
      toast({
        title: "Creation Failed",
        description: "There was an error creating the bracket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Playoff Bracket</DialogTitle>
          <DialogDescription>
            Create a new playoff bracket and select the teams to participate.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  <div className="border rounded-md p-2 h-[200px] overflow-y-auto">
                    {selectedDivisionId ? (
                      filteredTeams.length > 0 ? (
                        <div className="space-y-2">
                          {filteredTeams.map((team) => (
                            <div 
                              key={team.id} 
                              className={`flex items-center p-2 rounded cursor-pointer ${
                                isTeamSelected(team.id) 
                                  ? 'bg-cornhole-green/20 border border-cornhole-green' 
                                  : 'hover:bg-gray-100'
                              }`}
                              onClick={() => toggleTeamSelection(team.id)}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                {team.logoUrl && (
                                  <img 
                                    src={team.logoUrl} 
                                    alt={team.name} 
                                    className="w-full h-full object-contain"
                                  />
                                )}
                              </div>
                              <span>{team.name}</span>
                              <span className="ml-auto text-xs">
                                {team.wins}-{team.losses}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-gray-500">
                          No teams found in this division
                        </p>
                      )
                    ) : (
                      <p className="text-center py-4 text-gray-500">
                        Please select a division first
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Selected: {form.watch("teams").length} teams
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BracketCreationDialog;
