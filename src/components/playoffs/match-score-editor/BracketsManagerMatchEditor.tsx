import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useBracketsManagerMatch } from '@/hooks/playoffs/useBracketsManagerMatch';
import { bracketManagerService } from '@/services/brackets/manager';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface BracketsManagerMatchEditorProps {
  matchId: number | null;
  bracketId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BracketsManagerMatchEditor: React.FC<BracketsManagerMatchEditorProps> = ({
  matchId,
  bracketId,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: matchData, isLoading, error } = useBracketsManagerMatch(matchId);
  
  const [opponent1Score, setOpponent1Score] = useState<number>(0);
  const [opponent2Score, setOpponent2Score] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when match data loads
  useEffect(() => {
    if (matchData) {
      setOpponent1Score(matchData.opponent1?.score ?? 0);
      setOpponent2Score(matchData.opponent2?.score ?? 0);
    }
  }, [matchData]);

  const handleSave = async () => {
    if (!matchId || !matchData) return;

    try {
      setIsSaving(true);
      
      // Check if this is a BYE match (one opponent is null)
      const isBye = !matchData.opponent1 || !matchData.opponent2;
      
      log('Saving brackets-manager match', {
        matchId,
        opponent1Score,
        opponent2Score,
        isBye,
        hasOpponent1: !!matchData.opponent1,
        hasOpponent2: !!matchData.opponent2
      });

      // For BYE matches, only update the opponent that exists
      if (isBye) {
        const scores: any = {};
        
        if (matchData.opponent1) {
          scores.opponent1 = { 
            score: opponent1Score,
            result: "win" as const
          };
        } else if (matchData.opponent2) {
          scores.opponent2 = { 
            score: opponent2Score,
            result: "win" as const
          };
        }

        await bracketManagerService.updateMatch({
          matchId,
          scores
        });
      } else {
        // Regular match - determine winner based on scores
        const scores: {
          opponent1: { score: number; result?: "win" | "loss" };
          opponent2: { score: number; result?: "win" | "loss" };
        } = {
          opponent1: { 
            score: opponent1Score,
            result: opponent1Score > opponent2Score ? "win" as const : "loss" as const
          },
          opponent2: { 
            score: opponent2Score,
            result: opponent2Score > opponent1Score ? "win" as const : "loss" as const
          }
        };

        await bracketManagerService.updateMatch({
          matchId,
          scores
        });
      }

      // Invalidate all bracket-related queries to trigger refresh
      await queryClient.invalidateQueries({ queryKey: ['brackets-manager-match', matchId] });
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });

      toast({
        title: 'Match Updated',
        description: 'Match score saved successfully with auto-progression'
      });

      onClose();
    } catch (err) {
      console.error('Error updating match:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update match',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !matchData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-destructive">Failed to load match data. Please try again.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Detect BYE or waiting match
  // According to brackets-manager docs: BYEs are "only during creation"
  // Matches with one null opponent are either:
  // - Status 5 (Archived): Permanent BYE - already completed
  // - Status 1 (Waiting): Waiting for opponent from previous match
  // Both should NOT be manually edited
  const isByeOrWaiting = !matchData.opponent1 || !matchData.opponent2;
  
  // Show error UI for BYE/waiting matches that shouldn't be edited
  if (isByeOrWaiting) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cannot Edit This Match</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {matchData.opponent1 || matchData.opponent2 ? (
              // One opponent present - waiting for second
              <>
                <p className="text-muted-foreground">
                  This match is waiting for an opponent to be determined from a previous match.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">
                    {matchData.opponent1?.name || matchData.opponent2?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">vs. TBD</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once the previous matches are completed, this match will automatically be populated with both opponents.
                </p>
              </>
            ) : (
              // No opponents - locked until previous matches complete
              <>
                <p className="text-muted-foreground">
                  This match is locked until the preceding matches are completed.
                </p>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="font-medium">TBD vs. TBD</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Both opponents will be determined automatically by the bracket system.
                </p>
              </>
            )}
            
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">📘 How brackets-manager works:</p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                BYE matches and opponent propagation are handled automatically. You cannot manually edit matches that are waiting for opponents.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Regular match UI
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Match Score</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Team 1 Score */}
          <div className="space-y-2">
            <Label htmlFor="team1-score">
              {matchData.opponent1?.name || 'Team 1'} Score
            </Label>
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
            <Label htmlFor="team2-score">
              {matchData.opponent2?.name || 'Team 2'} Score
            </Label>
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
          {matchData.games.length > 0 && (
            <div className="space-y-2">
              <Label>Games</Label>
              <div className="space-y-1 text-sm text-muted-foreground">
                {matchData.games.map((game) => (
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
