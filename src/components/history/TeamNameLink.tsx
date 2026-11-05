import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { toTeamSlug } from '@/utils/teamSlug';

// The name the season stats service gives a team whose name join came back empty
// (src/services/seasons/SeasonStatsService.ts, `item.teams?.name || 'Unknown Team'`).
// No team page exists for it: its address would be a 404, so it stays plain text.
const UNKNOWN_TEAM_NAME = 'Unknown Team';

interface TeamNameLinkProps {
  name: string;
  /** How the name looks: size, weight, colour and how a long name is cut (clamp or truncate). */
  className?: string;
  /**
   * How big the tap area is.
   * `large`: 44px high (the `hit-area-44` utility), for the phone cards and the table rows.
   * `small`: about 24px high, for the Champions card, where rows are only 6px apart and
   * two 44px areas would overlap.
   */
  tapArea?: 'large' | 'small';
}

// No underline until hover (like the Stats page). The text colour is set by the caller.
const LINK_BASE =
  'min-w-0 rounded-sm hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

const TAP_AREA = {
  // Grows the tap area without changing the drawn size. The link must not clip its own
  // overflow, so the clamp or truncate lives on the span inside it.
  large: 'hit-area-44 block',
  // 6px of padding above and below, taken back with a negative margin so nothing moves.
  // `relative` keeps the padding on top of the line under it, so the area stays whole.
  small: 'relative block -my-1.5 py-1.5',
} as const;

/**
 * A team name that links to the team page. Plain text when the team has no page.
 * The link text is the team name, so the link has no separate accessible label.
 */
const TeamNameLink: React.FC<TeamNameLinkProps> = ({ name, className, tapArea = 'large' }) => {
  const slug = toTeamSlug(name);

  if (name === UNKNOWN_TEAM_NAME || slug === '') {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link to={`/teams/${slug}`} className={cn(LINK_BASE, TAP_AREA[tapArea])}>
      <span className={className}>{name}</span>
    </Link>
  );
};

export default TeamNameLink;
