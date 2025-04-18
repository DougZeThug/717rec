
import React from "react";
import { Button } from "@/components/ui/button";
import { Team } from "@/types";
import { ThursdayDatePicker } from "../batch-matches/ThursdayDatePicker";
import MatchFormRow from "./MatchFormRow";
import { MatchPair } from "./types";

interface BatchMatchFormProps {
  teams: Team[];
  onSubmit: (matches: any[]) => void;
  onCancel: () => void;
}

const BatchMatchForm = ({ teams, onSubmit, onCancel }: BatchMatchFormProps) => {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [matches, setMatches] = React.useState<MatchPair[]>([
    { id: '1', team1Id: null, team2Id: null, timeslot: null }
  ]);

  const addMatch = () => {
    setMatches([
      ...matches,
      { 
        id: Date.now().toString(), 
        team1Id: null, 
        team2Id: null, 
        timeslot: null 
      }
    ]);
  };

  const removeMatch = (id: string) => {
    setMatches(matches.filter(match => match.id !== id));
  };

  const updateMatch = (id: string, updates: Partial<MatchPair>) => {
    setMatches(matches.map(match =>
      match.id === id ? { ...match, ...updates } : match
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    onSubmit(matches.map(match => ({
      ...match,
      date: selectedDate
    })));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ThursdayDatePicker
        selected={selectedDate}
        onSelect={setSelectedDate}
      />

      <div className="space-y-4">
        {matches.map((match) => (
          <MatchFormRow
            key={match.id}
            match={match}
            teams={teams}
            onUpdate={(updates) => updateMatch(match.id, updates)}
            onRemove={() => removeMatch(match.id)}
          />
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
            disabled={!selectedDate || matches.some(m => !m.team1Id || !m.team2Id || !m.timeslot)}
          >
            Create Matches
          </Button>
        </div>
      </div>
    </form>
  );
};

export default BatchMatchForm;
