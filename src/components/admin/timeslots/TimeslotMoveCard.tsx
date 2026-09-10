import { ArrowRight, Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { describeMovePlan, isActionable, type MovePlan } from '@/utils/timeslotMove';

interface TimeslotMoveCardProps {
  plan: MovePlan;
  teamName: string;
  /** The night, already written out, e.g. "Thursday, 17 September". */
  dateLabel: string;
  /** What the team typed, shown so a misreading can be spotted. */
  requestedText?: string | null;
  isSubmitting?: boolean;
  onMove: () => void;
  onDismiss: () => void;
}

/**
 * The change an approved request asks for, stated in words, with one button.
 *
 * Raised when another admin section hands Timeslots a night, a team and a
 * block — today that is the Requests approval toast. It says what pressing the
 * button will remove as well as what it will add, because a move is a delete
 * and an insert and the delete is the half that loses something.
 *
 * Some plans carry no button at all. That is deliberate: a team with two games
 * that night has two bookings a time change could mean, and the request does
 * not say which.
 */
const TimeslotMoveCard: React.FC<TimeslotMoveCardProps> = ({
  plan,
  teamName,
  dateLabel,
  requestedText,
  isSubmitting = false,
  onMove,
  onDismiss,
}) => {
  const words = describeMovePlan(plan, { teamName, dateLabel, requestedText });
  const canAct = isActionable(plan) && words.action !== null;

  return (
    <Card
      className={cn(
        'mb-6 border-primary/40 bg-primary/5',
        !canAct && 'border-amber-500/50 bg-amber-500/5'
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            {words.title}
          </h3>
          <p className="text-sm text-muted-foreground">{words.body}</p>
          {/* Moving a booking changes when a team is expected. It does not
              change a match that has already been created for that night. */}
          <p className="text-xs text-muted-foreground">
            This changes when the team is expected. It does not change a match that has already been
            created for this night.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {canAct && (
            <Button onClick={onMove} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />}
              {isSubmitting ? 'Working…' : words.action}
            </Button>
          )}
          <Button variant="outline" onClick={onDismiss} disabled={isSubmitting}>
            {canAct ? 'Not now' : 'Close'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeslotMoveCard;
