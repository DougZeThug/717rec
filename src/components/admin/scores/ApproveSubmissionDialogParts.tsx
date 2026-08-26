import { MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { formatWithPattern } from '@/utils/formatDateSafe';

import { SCORE_OPTIONS, type ScoreOption } from '../mass-score-entry/components/types';

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

interface ResultPickerProps {
  team1Name: string;
  team2Name: string;
  selectedLabel: string | null;
  onSelect: (option: ScoreOption) => void;
}

/** Name the winner of a score option from the two team names. */
const winnerNameFor = (option: ScoreOption, team1Name: string, team2Name: string) =>
  option.team1Score === 1 ? team1Name : team2Name;

/**
 * The four results a best-of-three match can end in.
 *
 * Reuses SCORE_OPTIONS, the same set the admin Scores tab offers, so an
 * impossible result such as 0-0 or 3-2 cannot be entered at all. Each option
 * is labelled from the winner's side, so "Owls 2-1" reads the way an admin
 * says it.
 */
export const ResultPicker = ({
  team1Name,
  team2Name,
  selectedLabel,
  onSelect,
}: ResultPickerProps) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-medium mb-2">
      What was the result? <span className="text-destructive">*</span>
    </legend>
    <div className="grid grid-cols-2 gap-2">
      {SCORE_OPTIONS.map((option) => {
        const winnerGames = Math.max(option.team1GameWins, option.team2GameWins);
        const loserGames = Math.min(option.team1GameWins, option.team2GameWins);
        return (
          <Button
            key={option.label}
            type="button"
            variant={selectedLabel === option.label ? 'default' : 'outline'}
            aria-pressed={selectedLabel === option.label}
            onClick={() => onSelect(option)}
            className="h-auto py-2 whitespace-normal"
          >
            {winnerNameFor(option, team1Name, team2Name)} {winnerGames}–{loserGames}
          </Button>
        );
      })}
    </div>
  </fieldset>
);
