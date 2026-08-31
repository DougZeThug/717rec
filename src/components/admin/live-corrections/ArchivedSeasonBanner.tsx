import { Lock } from 'lucide-react';
import React from 'react';

export interface ArchivedSeasonBannerProps {
  seasonName: string | null;
}

/**
 * B-20: an archived season is frozen, so its rounds are readable and nothing on
 * them can be pressed. This says which season and what the freeze covers, since
 * "frozen" otherwise reads as being only about the computed numbers.
 */
export const ArchivedSeasonBanner: React.FC<ArchivedSeasonBannerProps> = ({ seasonName }) => (
  <div
    className="flex gap-2 items-start rounded-md border border-border bg-muted/40 p-3 text-sm"
    role="status"
  >
    <Lock className="size-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
    <div>
      <strong>{seasonName ?? 'This season'}</strong> is archived, so this match is read-only. An
      archived season is frozen: its rounds, its games and the numbers derived from them stay
      exactly as the league left them. You can read everything below; nothing here can be changed.
    </div>
  </div>
);
