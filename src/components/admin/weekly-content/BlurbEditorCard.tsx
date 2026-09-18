import { Loader2, Wand2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { RecapTeamGrade } from '@/types/recapEdition';

import type { PackDraft } from './useWeeklyContentPack';

const BLURB_SOURCE_NOTES: Record<PackDraft['blurbsSource'], string> = {
  ai: 'Written by AI. Edit any of them.',
  ai_edited: 'AI drafts, edited by you.',
  fallback:
    'Built from the results. Press Write blurbs for me for something with more personality.',
  manual: 'Your own words.',
};

/** The most a line can be before it is cut off on the graphic. */
const BLURB_MAX_LENGTH = 120;

interface BlurbEditorCardProps {
  rankings: RecapTeamGrade[];
  blurbs: Record<string, string>;
  blurbsSource: PackDraft['blurbsSource'];
  isGeneratingBlurbs: boolean;
  onBlurbChange: (teamId: string, blurb: string) => void;
  onGenerateBlurbs: () => void;
}

/** Places gained or lost, or null when there is nothing to compare with. */
const movementLabel = (team: RecapTeamGrade): string => {
  if (team.previousRank === null) return '—';
  const moved = team.previousRank - team.rank;
  if (moved > 0) return `▲${moved}`;
  if (moved < 0) return `▼${Math.abs(moved)}`;
  return '▬';
};

const movementClass = (team: RecapTeamGrade): string => {
  if (team.previousRank === null) return 'text-muted-foreground';
  const moved = team.previousRank - team.rank;
  if (moved > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (moved < 0) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
};

/** One team's line, with the numbers that explain it alongside. */
const BlurbRow: React.FC<{
  team: RecapTeamGrade;
  blurb: string;
  onChange: (blurb: string) => void;
}> = ({ team, blurb, onChange }) => (
  <div className="flex flex-col gap-1.5 py-2.5">
    <div className="flex items-center gap-2 text-sm">
      <span className="w-7 shrink-0 text-right font-semibold tabular-nums">{team.rank}</span>
      <span className={`w-9 shrink-0 text-xs tabular-nums ${movementClass(team)}`}>
        {movementLabel(team)}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{team.teamName}</span>
      <span className="w-8 shrink-0 text-center text-xs font-semibold">{team.grade ?? '—'}</span>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {team.wins}–{team.losses}
      </span>
    </div>
    <Input
      aria-label={`Blurb for ${team.teamName}`}
      value={blurb}
      onChange={(e) => onChange(e.target.value)}
      maxLength={BLURB_MAX_LENGTH}
      className="h-8 text-sm"
      placeholder="One line about this team."
    />
  </div>
);

/**
 * One line per team, in rank order.
 *
 * A textarea each would be twenty-six boxes down the page; a single-line input
 * matches what actually fits on the graphic anyway. The full text still shows
 * on the edition's web page.
 */
const BlurbEditorCard: React.FC<BlurbEditorCardProps> = ({
  rankings,
  blurbs,
  blurbsSource,
  isGeneratingBlurbs,
  onBlurbChange,
  onGenerateBlurbs,
}) => {
  if (rankings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Power rankings ({rankings.length} teams)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={onGenerateBlurbs} disabled={isGeneratingBlurbs}>
            {isGeneratingBlurbs ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Write blurbs for me
          </Button>
          <p className="text-xs text-muted-foreground">{BLURB_SOURCE_NOTES[blurbsSource]}</p>
        </div>

        <div className="flex flex-col divide-y">
          {rankings.map((team) => (
            <BlurbRow
              key={team.teamId}
              team={team}
              blurb={blurbs[team.teamId] ?? ''}
              onChange={(blurb) => onBlurbChange(team.teamId, blurb)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlurbEditorCard;
