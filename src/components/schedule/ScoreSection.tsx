
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScoreSectionProps } from "./types";

const ScoreSection: React.FC<ScoreSectionProps> = ({
  isCompleted,
  team1Id,
  team2Id,
  team1Score,
  team2Score,
  setTeam1Score,
  setTeam2Score,
  teams
}) => {
  if (!isCompleted) return null;
  
  return (
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
  );
};

export default ScoreSection;
