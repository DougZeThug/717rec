import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { PendingMatch, ScoreSubmission, usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';
import { formatDate, formatTime } from './utils';

interface ScoreSubmissionModalProps {
  match: PendingMatch;
  open: boolean;
  onClose: () => void;
}

export const ScoreSubmissionModal: React.FC<ScoreSubmissionModalProps> = ({
  match,
  open,
  onClose
}) => {
  const { submitScore, isSubmitting } = usePendingScoresMatches();
  const [formData, setFormData] = useState<ScoreSubmission>({
    submitter_name: '',
    submitter_team: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.submitter_name.trim() || !formData.message.trim()) {
      return;
    }

    const success = await submitScore(match.id, formData);
    if (success) {
      setFormData({ submitter_name: '', submitter_team: '', message: '' });
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({ submitter_name: '', submitter_team: '', message: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Match Score</DialogTitle>
          <DialogDescription>
            Submit a score report for admin review
          </DialogDescription>
        </DialogHeader>

        {/* Match Info */}
        <div className="border rounded-lg p-3 bg-muted/50">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {match.team1_logo && (
                <img 
                  src={match.team1_logo} 
                  alt={`${match.team1_name} logo`}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="font-medium text-sm">{match.team1_name}</span>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{match.team2_name}</span>
              {match.team2_logo && (
                <img 
                  src={match.team2_logo} 
                  alt={`${match.team2_name} logo`}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            {formatDate(match.date)} at {formatTime(match.date)}
            {match.location && ` • ${match.location}`}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="submitter_name">Your Name *</Label>
            <Input
              id="submitter_name"
              value={formData.submitter_name}
              onChange={(e) => setFormData(prev => ({ ...prev, submitter_name: e.target.value }))}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submitter_team">Your Team (optional)</Label>
            <Input
              id="submitter_team"
              value={formData.submitter_team}
              onChange={(e) => setFormData(prev => ({ ...prev, submitter_team: e.target.value }))}
              placeholder="e.g., Team Alpha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Score Report *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="e.g., Team Alpha beat Team Beta 2-1. Great match!"
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Include the final score and any relevant details about the match.
            </p>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.submitter_name.trim() || !formData.message.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};