import { Flame } from 'lucide-react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TeamStreakInfo } from '@/services/WeeklyRecapService';
import { typeScale } from '@/styles/design-system';
import { toTeamSlug } from '@/utils/teamSlug';

import MobileSectionShell from './WeeklyRecapMobileSectionShell';
import { StreakRowProps } from './weeklyRecapTypes';

function MobileStreakRow({ team, winter }: StreakRowProps) {
  return (
    <Link to={`/teams/${toTeamSlug(team.teamName)}`} className="flex items-center gap-1.5 group">
      <TeamLogo imageUrl={team.logoUrl} teamName={team.teamName} size="xs" />
      <span
        className={cn(
          'text-xs font-medium transition-colors flex-1 min-w-0 leading-tight',
          winter
            ? 'text-cyan-50 group-hover:text-cyan-300'
            : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
        )}
      >
        {team.teamName}
      </span>
      <span className="shrink-0 text-[10px] font-bold tabular-nums bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">
        {team.streak}
      </span>
    </Link>
  );
}

function StreakRow({ team, winter }: StreakRowProps) {
  return (
    <Link to={`/teams/${toTeamSlug(team.teamName)}`} className="flex items-center gap-2 group">
      <TeamLogo imageUrl={team.logoUrl} teamName={team.teamName} size="xs" />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            typeScale.body,
            'font-medium truncate transition-colors block',
            winter
              ? 'text-cyan-50 group-hover:text-cyan-300'
              : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
          )}
        >
          {team.teamName}
        </span>
        <span className={cn(typeScale.caption, 'text-muted-foreground truncate block')}>
          {team.division}
        </span>
      </div>
      <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs tabular-nums">
        <Flame size={10} />
        {team.streak}
      </Badge>
    </Link>
  );
}

function StreaksSection({ streaks, winter }: { streaks: TeamStreakInfo[]; winter: boolean }) {
  if (streaks.length === 0) return null;
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        <MobileSectionShell
          icon={<Flame size={12} className="text-orange-500" />}
          title="Winning Streaks"
        >
          {streaks.map((team) => (
            <MobileStreakRow key={team.teamId} team={team} winter={winter} />
          ))}
        </MobileSectionShell>
      </div>
      <section className="hidden md:block space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame size={13} className="text-orange-500" />
          <span
            className={cn(
              typeScale.caption,
              'font-semibold uppercase tracking-wider text-muted-foreground'
            )}
          >
            Hot Streaks
          </span>
        </div>
        {streaks.map((team) => (
          <StreakRow key={team.teamId} team={team} winter={winter} />
        ))}
      </section>
    </>
  );
}

export default StreaksSection;
