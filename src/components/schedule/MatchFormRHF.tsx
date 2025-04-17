
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Match } from "@/types";
import { MatchFormProps, MatchFormValues } from "./types";
import { createDateWithTime, determineMatchOutcome } from "./form-utils";
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const MatchFormRHF: React.FC<MatchFormProps> = ({ match, teams, onSubmit, onCancel }) => {
  // Set up time slots with consistent formatting
  const timeSlots = ["6:30 PM", "7:30 PM", "8:30 PM"];
  
  // Initialize form with default values or existing match data
  const form = useForm<MatchFormValues>({
    defaultValues: match 
      ? {
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          date: new Date(match.date),
          timeSlot: timeSlots.find(slot => {
            const matchDate = new Date(match.date);
            const hours = matchDate.getHours();
            const minutes = matchDate.getMinutes();
            
            if (hours === 18 && minutes === 30) return slot === "6:30 PM";
            if (hours === 19 && minutes === 30) return slot === "7:30 PM";
            if (hours === 20 && minutes === 30) return slot === "8:30 PM";
            return false;
          }) || null,
          isCompleted: match.iscompleted,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
        }
      : {
          team1Id: "",
          team2Id: "",
          date: new Date(),
          timeSlot: null,
          isCompleted: false,
        }
  });
  
  const handleSubmitForm = (values: MatchFormValues) => {
    // Create date with selected time
    const dateWithTime = createDateWithTime(values.date, values.timeSlot);
    
    // Determine winner and loser
    const { winnerId, loserId } = determineMatchOutcome(
      values.isCompleted,
      values.team1Id,
      values.team2Id,
      values.team1Score,
      values.team2Score
    );
    
    onSubmit({
      team1Id: values.team1Id,
      team2Id: values.team2Id,
      date: dateWithTime.toISOString(),
      location: "", // Setting to empty string for legacy compatibility
      iscompleted: values.isCompleted,
      team1Score: values.isCompleted ? values.team1Score : undefined,
      team2Score: values.isCompleted ? values.team2Score : undefined,
      winnerId,
      loserId
    });
  };

  const isCompleted = form.watch("isCompleted");
  const team1Id = form.watch("team1Id");
  const team2Id = form.watch("team2Id");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team 1 Selection */}
          <FormField
            control={form.control}
            name="team1Id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team 1</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  required
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team 1" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teams
                      .filter(team => team.id !== team2Id)
                      .map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Team 2 Selection */}
          <FormField
            control={form.control}
            name="team2Id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team 2</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  required
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Team 2" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teams
                      .filter(team => team.id !== team1Id)
                      .map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Date Selection */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? `${field.value.getFullYear()}-${String(field.value.getMonth() + 1).padStart(2, '0')}-${String(field.value.getDate()).padStart(2, '0')}` : ""}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Time Slot Selection */}
        <FormField
          control={form.control}
          name="timeSlot"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Time Slot</FormLabel>
              <div className="flex flex-wrap gap-3">
                {timeSlots.map(time => (
                  <div key={time} className="flex items-center">
                    <Button
                      type="button"
                      variant={field.value === time ? "default" : "outline"}
                      className={`
                        w-28 transition-colors py-2
                        ${field.value === time ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
                      `}
                      onClick={() => field.onChange(time)}
                    >
                      {time}
                    </Button>
                  </div>
                ))}
              </div>
              {!field.value && <p className="text-sm text-destructive">Please select a time slot</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Match Status Toggle */}
        <FormField
          control={form.control}
          name="isCompleted"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 mb-4">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label htmlFor="isCompleted">Match Completed</Label>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Score Section (conditionally rendered) */}
        {isCompleted && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
            <FormField
              control={form.control}
              name="team1Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {teams.find(team => team.id === team1Id)?.name || "Team 1"} Score
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      required={isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="team2Score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {teams.find(team => team.id === team2Id)?.name || "Team 2"} Score
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      required={isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-cornhole-navy hover:bg-cornhole-navy/90" 
            disabled={!form.watch("timeSlot")}
          >
            {match ? "Update Match" : "Create Match"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MatchFormRHF;
