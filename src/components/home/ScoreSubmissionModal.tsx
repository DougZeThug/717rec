import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Textarea } from '@/components/ui/textarea';
import { PendingMatch, usePendingScoresMatches } from '@/hooks/usePendingScoresMatches';

import { formatDate, formatTime } from './utils';

const scoreSubmissionSchema = z.object({
  submitter_name: z.string().min(1, 'Your name is required'),
  submitter_team: z.string().optional(),
  message: z.string().min(1, 'Score report is required'),
});

type ScoreSubmissionFormData = z.infer<typeof scoreSubmissionSchema>;

interface ScoreSubmissionModalProps {
  match: PendingMatch;
  open: boolean;
  onClose: () => void;
}

export const ScoreSubmissionModal: React.FC<ScoreSubmissionModalProps> = ({
  match,
  open,
  onClose,
}) => {
  const { submitScore, isSubmitting } = usePendingScoresMatches();

  const form = useForm<ScoreSubmissionFormData>({
    resolver: zodResolver(scoreSubmissionSchema),
    defaultValues: {
      submitter_name: '',
      submitter_team: '',
      message: '',
    },
  });

  const handleSubmit = async (data: ScoreSubmissionFormData) => {
    const success = await submitScore(match.id, {
      submitter_name: data.submitter_name,
      submitter_team: data.submitter_team || '',
      message: data.message,
    });
    if (success) {
      form.reset();
      onClose();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Report Match Score</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Submit a score report for admin review
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="submitter_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Your Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="submitter_team"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Team (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Team Alpha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Score Report <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Team Alpha beat Team Beta 2-1. Great match!"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Include the final score and any relevant details about the match.
                  </p>
                </FormItem>
              )}
            />

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
