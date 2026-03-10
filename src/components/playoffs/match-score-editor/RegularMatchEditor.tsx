import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegularMatchEditorProps {
  opponent1Name: string;
  opponent2Name: string;
  opponent1Score: number;
  opponent2Score: number;
  setOpponent1Score: (score: number) => void;
  setOpponent2Score: (score: number) => void;
  games: Array<{
    id: number;
    number: number;
    opponent1_score: number | null;
    opponent2_score: number | null;
  }>;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const RegularMatchEditor: React.FC<RegularMatchEditorProps> = ({
  opponent1Name,
  opponent2Name,
  opponent1Score,
  opponent2Score,
  setOpponent1Score,
  setOpponent2Score,
  games,
  isSaving,
  onSave,
  onClose,
}) => {
  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Match Score</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Team 1 Score */}
        <div className="space-y-2">
          <Label htmlFor="team1-score">{opponent1Name} Score</Label>
          <Input
            id="team1-score"
            type="number"
            min="0"
            value={opponent1Score}
            onChange={(e) => setOpponent1Score(parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>

        {/* Team 2 Score */}
        <div className="space-y-2">
          <Label htmlFor="team2-score">{opponent2Name} Score</Label>
          <Input
            id="team2-score"
            type="number"
            min="0"
            value={opponent2Score}
            onChange={(e) => setOpponent2Score(parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>

        {/* Game Details (Read-only display) */}
        {games.length > 0 && (
          <div className="space-y-2">
            <Label>Games</Label>
            <div className="space-y-1 text-sm text-muted-foreground">
              {games.map((game) => (
                <div key={game.id} className="flex justify-between">
                  <span>Game {game.number}:</span>
                  <span>
                    {game.opponent1_score ?? '-'} - {game.opponent2_score ?? '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </DialogContent>
  );
};
