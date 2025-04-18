
import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team } from "@/types";
import { ThursdayDatePicker } from "../batch-matches/ThursdayDatePicker";
import { X } from "lucide-react";

interface MatchRow {
  id: string;
  team1Id: string;
  team2Id: string;
  timeSlot: string;
}

interface BatchMatchFormProps {
  teams: Team[];
  onSubmit: (matches: MatchRow[]) => void;
  onCancel: () => void;
}

const BatchMatchForm = ({ teams, onSubmit, onCancel }: BatchMatchFormProps) => {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [matches, setMatches] = React.useState<MatchRow[]>([
    { id: '1', team1Id: '', team2Id: '', timeSlot: '' }
  ]);

  const timeSlots = [
    "6:30 PM",
    "7:00 PM",
    "7:30 PM",
    "8:00 PM",
    "8:30 PM",
    "9:00 PM"
  ];

  const addMatch = () => {
    setMatches([
      ...matches,
      { 
        id: Date.now().toString(), 
        team1Id: '', 
        team2Id: '', 
        timeSlot: '' 
      }
    ]);
  };

  const removeMatch = (id: string) => {
    setMatches(matches.filter(match => match.id !== id));
  };

  const updateMatch = (id: string, field: keyof MatchRow, value: string) => {
    setMatches(matches.map(match =>
      match.id === id ? { ...match, [field]: value } : match
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    onSubmit(matches);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ThursdayDatePicker
        selected={selectedDate}
        onSelect={setSelectedDate}
      />

      <div className="space-y-4">
        {matches.map((match) => (
          <div key={match.id} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
            <Select
              value={match.team1Id}
              onValueChange={(value) => updateMatch(match.id, 'team1Id', value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Team 1" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter(team => team.id !== match.team2Id)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground">vs</span>

            <Select
              value={match.team2Id}
              onValueChange={(value) => updateMatch(match.id, 'team2Id', value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Team 2" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter(team => team.id !== match.team1Id)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={match.timeSlot}
              onValueChange={(value) => updateMatch(match.id, 'timeSlot', value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMatch(match.id)}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={addMatch}>
          + Add Another Match
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!selectedDate || matches.some(m => !m.team1Id || !m.team2Id || !m.timeSlot)}
          >
            Create Matches
          </Button>
        </div>
      </div>
    </form>
  );
};

export default BatchMatchForm;
