import { UseFormReturn } from 'react-hook-form';

import type { Match, Team } from '@/types';

export interface MatchFormProps {
  match?: Match;
  teams: Team[];
  onSubmit: (match: Omit<Match, 'id'>) => void;
  onCancel: () => void;
  form?: UseFormReturn<MatchFormValues>;
  /** Whether an update operation is in progress (prevents double-submit) */
  isUpdating?: boolean;
  /** Whether a create operation is in progress (prevents double-submit) */
  isCreating?: boolean;
}

export interface MatchFormValues {
  team1Id: string;
  team2Id: string;
  date: Date;
  timeSlot: string | null;
  isCompleted: boolean;
  team1Score?: number;
  team2Score?: number;
}
