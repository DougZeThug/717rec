import { Users } from 'lucide-react';
import React from 'react';

import type { DivisionFilter, TeamFilter } from '@/hooks/scheduling/useScheduleUrlState';
import { cn } from '@/lib/utils';
import { getDivisionBadgeColor } from '@/utils/colors/divisionColors';
import type { DivisionOption } from '@/utils/schedule/matchFilters';

interface ScheduleFiltersProps {
  options: DivisionOption[];
  division: DivisionFilter;
  onDivisionChange: (division: DivisionFilter) => void;
  team: TeamFilter;
  onTeamChange: (team: TeamFilter) => void;
  /** False for a visitor with no approved team; there is nothing to filter to. */
  showMyTeam: boolean;
}

interface FilterChipProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
  /** Classes for the pressed state, so a division wears its own colour. */
  activeClassName?: string;
  icon?: React.ReactNode;
}

/**
 * One chip.
 *
 * Sized to its own label and free to wrap, rather than sharing one row equally:
 * "Recreational" beside three others does not fit a 390-pixel screen, and a
 * control row clipped on a phone is the defect T-01 and X-10 are about.
 *
 * `min-h-11` is 44 pixels, the target Q14 set for the pages people use on a
 * phone. `aria-pressed` rather than colour alone, so the chip that is on is
 * announced.
 */
const FilterChip: React.FC<FilterChipProps> = ({
  label,
  pressed,
  onClick,
  activeClassName,
  icon,
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={cn(
      'flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors',
      pressed
        ? (activeClassName ?? 'bg-primary text-primary-foreground')
        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
    )}
  >
    {icon}
    {label}
  </button>
);

/**
 * Narrows the week to one division, or to the signed-in member's own matches.
 *
 * UX audit SC-02: the page carried a date and a free-text search and nothing
 * else, so a player looking for their own next match had to know the night or
 * type their team's name.
 *
 * Divisions are single-select — the same idiom as Standings' Division/All
 * toggle. "My team" is separate because it is a different question: a member
 * can want their own matches in any division, or every match in one.
 */
export const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  options,
  division,
  onDivisionChange,
  team,
  onTeamChange,
  showMyTeam,
}) => {
  if (options.length === 0 && !showMyTeam) return null;

  // A value in the address naming no real division falls back to All, so the
  // chips never show a selection the list cannot explain.
  const known = options.some((option) => option.value === division);
  const isMine = team === 'mine';

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="schedule-filters">
      {options.length > 0 && (
        <>
          <FilterChip label="All" pressed={!known} onClick={() => onDivisionChange('all')} />
          {options.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              pressed={known && division === option.value}
              onClick={() => onDivisionChange(option.value)}
              // The division's own colour, the one this page already uses on
              // the timeslot cards.
              activeClassName={getDivisionBadgeColor(option.label)}
            />
          ))}
        </>
      )}

      {showMyTeam && (
        <FilterChip
          label="My team"
          pressed={isMine}
          onClick={() => onTeamChange(isMine ? 'all' : 'mine')}
          icon={<Users className="size-4" aria-hidden />}
        />
      )}
    </div>
  );
};
