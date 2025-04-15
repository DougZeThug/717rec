
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Team, Match } from "@/types";

interface MatchFormProps {
  match?: Match;
  teams: Team[];
  onSubmit: (match: Omit<Match, "id">) => void;
  onCancel: () => void;
}

const MatchForm: React.FC<MatchFormProps> = ({ match, teams, onSubmit, onCancel }) => {
  const [team1Id, setTeam1Id] = useState(match?.team1Id || "");
  const [team2Id, setTeam2Id] = useState(match?.team2Id || "");
  const [selectedDate, setSelectedDate] = useState(match ? new Date(match.date) : new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(match?.isCompleted || false);
  const [team1Score, setTeam1Score] = useState<number | undefined>(match?.team1Score);
  const [team2Score, setTeam2Score] = useState<number | undefined>(match?.team2Score);

  // Set up time slots with consistent formatting
  const timeSlots = ["6:30 PM", "7:30 PM", "8:30 PM"];

  useEffect(() => {
    // If editing an existing match, set the appropriate time slot
    if (match) {
      const matchDate = new Date(match.date);
      const matchHour = matchDate.getHours();
      const matchMinutes = matchDate.getMinutes();
      
      if (matchHour === 18 && matchMinutes === 30) {
        setSelectedTimeSlot("6:30 PM");
      } else if (matchHour === 19 && matchMinutes === 30) {
        setSelectedTimeSlot("7:30 PM");
      } else if (matchHour === 20 && matchMinutes === 30) {
        setSelectedTimeSlot("8:30 PM");
      }
    }
  }, [match]);

  const formatDateForInput = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create date with selected time
    const dateWithTime = new Date(selectedDate);
    
    if (selectedTimeSlot === "6:30 PM") {
      dateWithTime.setHours(18, 30, 0, 0);
    } else if (selectedTimeSlot === "7:30 PM") {
      dateWithTime.setHours(19, 30, 0, 0);
    } else if (selectedTimeSlot === "8:30 PM") {
      dateWithTime.setHours(20, 30, 0, 0);
    }
    
    let winnerId: string | undefined;
    let loserId: string | undefined;
    
    if (isCompleted && team1Score !== undefined && team2Score !== undefined) {
      if (team1Score > team2Score) {
        winnerId = team1Id;
        loserId = team2Id;
      } else if (team2Score > team1Score) {
        winnerId = team2Id;
        loserId = team1Id;
      }
    }
    
    onSubmit({
      team1Id,
      team2Id,
      date: dateWithTime.toISOString(),
      location: "", // Setting to empty string for legacy compatibility
      isCompleted,
      team1Score: isCompleted ? team1Score : undefined,
      team2Score: isCompleted ? team2Score : undefined,
      winnerId,
      loserId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="team1">Team 1</Label>
          <Select 
            value={team1Id} 
            onValueChange={setTeam1Id}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Team 1" />
            </SelectTrigger>
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
        </div>
        
        <div>
          <Label htmlFor="team2">Team 2</Label>
          <Select 
            value={team2Id} 
            onValueChange={setTeam2Id}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Team 2" />
            </SelectTrigger>
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
        </div>
      </div>
      
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formatDateForInput(selectedDate)}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Time Slot</Label>
        <RadioGroup 
          value={selectedTimeSlot || ''} 
          onValueChange={setSelectedTimeSlot}
          className="flex flex-wrap gap-3"
          required
        >
          {timeSlots.map(time => (
            <div key={time} className="flex items-center">
              <Button
                type="button"
                variant={selectedTimeSlot === time ? "default" : "outline"}
                className={`
                  w-28 transition-colors py-2
                  ${selectedTimeSlot === time ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
                `}
                onClick={() => setSelectedTimeSlot(time)}
              >
                {time}
              </Button>
            </div>
          ))}
        </RadioGroup>
        {!selectedTimeSlot && <p className="text-sm text-destructive">Please select a time slot</p>}
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <Switch
          id="isCompleted"
          checked={isCompleted}
          onCheckedChange={setIsCompleted}
        />
        <Label htmlFor="isCompleted">Match Completed</Label>
      </div>
      
      {isCompleted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50">
          <div>
            <Label htmlFor="team1Score">
              {teams.find(team => team.id === team1Id)?.name || "Team 1"} Score
            </Label>
            <Input
              id="team1Score"
              type="number"
              min="0"
              value={team1Score === undefined ? "" : team1Score}
              onChange={(e) => setTeam1Score(e.target.value ? parseInt(e.target.value) : undefined)}
              required={isCompleted}
            />
          </div>
          
          <div>
            <Label htmlFor="team2Score">
              {teams.find(team => team.id === team2Id)?.name || "Team 2"} Score
            </Label>
            <Input
              id="team2Score"
              type="number"
              min="0"
              value={team2Score === undefined ? "" : team2Score}
              onChange={(e) => setTeam2Score(e.target.value ? parseInt(e.target.value) : undefined)}
              required={isCompleted}
            />
          </div>
        </div>
      )}
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-cornhole-navy hover:bg-cornhole-navy/90" disabled={!selectedTimeSlot}>
          {match ? "Update Match" : "Create Match"}
        </Button>
      </div>
    </form>
  );
};

export default MatchForm;
