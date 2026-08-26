import { MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatWithPattern } from '@/utils/formatDateSafe';

/**
 * The presentational blocks of `ApproveSubmissionDialog`.
 *
 * Each one draws a single part of the form and holds no state. Every value and
 * every validation decision stays in the dialog, so there is one place that
 * decides whether the result can be confirmed.
 */

interface MatchSummaryProps {
  team1Name: string;
  team2Name: string;
  date: string | null | undefined;
  location: string | null | undefined;
}

/** Which match this report is about. */
export const MatchSummary = ({ team1Name, team2Name, date, location }: MatchSummaryProps) => (
  <div className="border rounded-lg p-3 bg-muted/50">
    <p className="font-medium text-sm text-center">
      {team1Name} vs {team2Name}
    </p>
    {date && (
      <p className="text-xs text-muted-foreground text-center mt-1">
        {formatWithPattern(date, "MMM d, yyyy 'at' h:mm a")}
        {location ? ` • ${location}` : ''}
      </p>
    )}
  </div>
);

interface SubmissionMessageProps {
  submitterName: string;
  message: string;
}

/** What the reporter said, word for word. */
export const SubmissionMessage = ({ submitterName, message }: SubmissionMessageProps) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <MessageSquare className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Reported by {submitterName}:</span>
    </div>
    <div className="bg-muted/50 p-3 rounded-md">
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

interface WinnerPickerProps {
  team1Name: string;
  team2Name: string;
  winner: 1 | 2 | null;
  onPick: (winner: 1 | 2) => void;
}

/** Which side won the match. */
export const WinnerPicker = ({ team1Name, team2Name, winner, onPick }: WinnerPickerProps) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-medium mb-2">
      Who won? <span className="text-destructive">*</span>
    </legend>
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={winner === 1 ? 'default' : 'outline'}
        aria-pressed={winner === 1}
        onClick={() => onPick(1)}
        className="h-auto py-2 whitespace-normal"
      >
        {team1Name}
      </Button>
      <Button
        type="button"
        variant={winner === 2 ? 'default' : 'outline'}
        aria-pressed={winner === 2}
        onClick={() => onPick(2)}
        className="h-auto py-2 whitespace-normal"
      >
        {team2Name}
      </Button>
    </div>
  </fieldset>
);

interface GameWinsFieldsProps {
  team1Name: string;
  team2Name: string;
  team1GameWins: string;
  team2GameWins: string;
  onTeam1Change: (value: string) => void;
  onTeam2Change: (value: string) => void;
}

/** The games each team took in the series. */
export const GameWinsFields = ({
  team1Name,
  team2Name,
  team1GameWins,
  team2GameWins,
  onTeam1Change,
  onTeam2Change,
}: GameWinsFieldsProps) => (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label htmlFor="team1-game-wins">{team1Name} games won</Label>
      <Input
        id="team1-game-wins"
        type="number"
        min={0}
        inputMode="numeric"
        value={team1GameWins}
        onChange={(event) => onTeam1Change(event.target.value)}
      />
    </div>
    <div className="space-y-1">
      <Label htmlFor="team2-game-wins">{team2Name} games won</Label>
      <Input
        id="team2-game-wins"
        type="number"
        min={0}
        inputMode="numeric"
        value={team2GameWins}
        onChange={(event) => onTeam2Change(event.target.value)}
      />
    </div>
  </div>
);
