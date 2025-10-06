import React, { useMemo } from "react";
import { Team, AutoScheduleMatch } from "@/types/autoSchedule";
import { ValidationResult } from "@/utils/autoSchedule/validation";
import EditableMatchCard from "./EditableMatchCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

interface EditableMatchListProps {
  matches: AutoScheduleMatch[];
  teams: Team[];
  validation: ValidationResult | null;
  onUpdateTeam: (matchId: string, teamPosition: 'team1' | 'team2', newTeamId: string) => void;
  onUpdateTimeslot: (matchId: string, newTimeslot: string) => void;
  onSwapTeams: (matchId: string) => void;
  onRemove: (matchId: string) => void;
}

const EditableMatchList: React.FC<EditableMatchListProps> = ({
  matches,
  teams,
  validation,
  onUpdateTeam,
  onUpdateTimeslot,
  onSwapTeams,
  onRemove
}) => {
  // Group matches by timeslot
  const matchesByTimeslot = useMemo(() => {
    const grouped = new Map<string, AutoScheduleMatch[]>();
    
    matches.forEach(match => {
      const timeslot = match.timeslot || 'No Timeslot';
      if (!grouped.has(timeslot)) {
        grouped.set(timeslot, []);
      }
      grouped.get(timeslot)!.push(match);
    });
    
    // Sort timeslots
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  // Get error for specific match
  const getMatchError = (matchId: string) => {
    if (!validation) return null;
    return validation.errors.find(error => error.matchId === matchId);
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No matches to edit</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Validation Summary */}
      {validation && (
        <Alert variant={validation.isValid ? "default" : "destructive"}>
          {validation.isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {validation.isValid ? (
              <span>Schedule is valid with no conflicts</span>
            ) : (
              <span>
                Found {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}.
                {validation.errors.length > 0 && ' Fix the issues highlighted below.'}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Matches grouped by timeslot */}
      {matchesByTimeslot.map(([timeslot, timeslotMatches]) => (
        <div key={timeslot} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            {timeslot} ({timeslotMatches.length} match{timeslotMatches.length !== 1 ? 'es' : ''})
          </h4>
          
          <div className="space-y-3">
            {timeslotMatches.map(match => {
              const error = getMatchError(match.id);
              return (
                <EditableMatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  onUpdateTeam={onUpdateTeam}
                  onUpdateTimeslot={onUpdateTimeslot}
                  onSwapTeams={onSwapTeams}
                  onRemove={onRemove}
                  hasError={!!error}
                  errorMessage={error?.message}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EditableMatchList;
