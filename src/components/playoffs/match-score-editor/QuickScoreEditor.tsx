
import React, { useState } from "react";
import { PlayoffMatch, Team } from "@/types";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickScoreEditorProps {
  match: PlayoffMatch;
  teams: Team[];
  onSave: (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => void;
  onCancel: () => void;
}

const QuickScoreEditor: React.FC<QuickScoreEditorProps> = ({
  match,
  teams,
  onSave,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find team details
  const team1 = match.team1Id ? teams.find(t => t.id === match.team1Id) : null;
  const team2 = match.team2Id ? teams.find(t => t.id === match.team2Id) : null;
  
  const team1Name = team1?.name || "Team 1";
  const team2Name = team2?.name || "Team 2";

  // For a best of 3 match, we have 4 possible outcomes: 2-0, 2-1, 1-2, 0-2
  const scoreOptions = [
    { team1GameWins: 2, team2GameWins: 0, label: "2-0", winner: match.team1Id },
    { team1GameWins: 2, team2GameWins: 1, label: "2-1", winner: match.team1Id },
    { team1GameWins: 1, team2GameWins: 2, label: "1-2", winner: match.team2Id },
    { team1GameWins: 0, team2GameWins: 2, label: "0-2", winner: match.team2Id },
  ];
  
  // Handle quick score submission
  const handleQuickScore = async (option: typeof scoreOptions[0]) => {
    if (!match.team1Id || !match.team2Id) return;
    
    setIsSubmitting(true);
    
    try {
      // Generate mock game data based on the score pattern
      const games: { team1Score: number; team2Score: number }[] = [];
      
      // For 2-0 or 0-2, we create two games with clear victories
      if (option.team1GameWins === 2 && option.team2GameWins === 0) {
        games.push({ team1Score: 21, team2Score: 15 });
        games.push({ team1Score: 21, team2Score: 16 });
      } 
      // For 0-2, team2 wins both games
      else if (option.team1GameWins === 0 && option.team2GameWins === 2) {
        games.push({ team1Score: 15, team2Score: 21 });
        games.push({ team1Score: 16, team2Score: 21 });
      }
      // For 2-1, team1 wins two, loses one
      else if (option.team1GameWins === 2 && option.team2GameWins === 1) {
        games.push({ team1Score: 21, team2Score: 17 });
        games.push({ team1Score: 18, team2Score: 21 });
        games.push({ team1Score: 21, team2Score: 15 });
      }
      // For 1-2, team1 wins one, loses two
      else if (option.team1GameWins === 1 && option.team2GameWins === 2) {
        games.push({ team1Score: 21, team2Score: 17 });
        games.push({ team1Score: 18, team2Score: 21 });
        games.push({ team1Score: 15, team2Score: 21 });
      }
      
      // Save the match score
      await onSave(
        match.id,
        option.team1GameWins > option.team2GameWins ? 1 : 0, // Binary match score
        option.team2GameWins > option.team1GameWins ? 1 : 0, // Binary match score
        games,
        option.team1GameWins,
        option.team2GameWins
      );
    } catch (error) {
      console.error("Error saving quick score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader className="text-left">
        <DialogTitle>Quick Score Entry</DialogTitle>
        <DialogDescription>
          Quickly enter the match score for {team1Name} vs {team2Name}
        </DialogDescription>
      </DialogHeader>

      <div className="py-6 flex flex-col space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center font-medium">{team1Name}</div>
          <div className="text-center font-medium">{team2Name}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Team logo/images */}
          <div className="flex justify-center">
            {team1?.imageUrl || team1?.logoUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={team1.imageUrl || team1.logoUrl}
                  alt={team1.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">T1</span>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {team2?.imageUrl || team2?.logoUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={team2.imageUrl || team2.logoUrl}
                  alt={team2.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">T2</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="text-sm font-medium">Quick Score Options:</div>
          <div className="grid grid-cols-2 gap-2">
            {scoreOptions.slice(0, 2).map(option => (
              <Button
                key={option.label}
                variant="outline"
                className={cn(
                  "h-12 text-lg font-mono",
                  option.winner === match.team1Id && "bg-blue-50 dark:bg-blue-900/20"
                )}
                onClick={() => handleQuickScore(option)}
                disabled={isSubmitting}
              >
                {option.label}
                <Check className="ml-1 h-4 w-4 text-green-500" />
              </Button>
            ))}

            {scoreOptions.slice(2, 4).map(option => (
              <Button
                key={option.label}
                variant="outline"
                className={cn(
                  "h-12 text-lg font-mono", 
                  option.winner === match.team2Id && "bg-red-50 dark:bg-red-900/20"
                )}
                onClick={() => handleQuickScore(option)}
                disabled={isSubmitting}
              >
                {option.label}
                <Check className="ml-1 h-4 w-4 text-green-500" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          <X className="mr-1 h-4 w-4" />
          Cancel
        </Button>
      </DialogFooter>
    </div>
  );
};

export default QuickScoreEditor;
