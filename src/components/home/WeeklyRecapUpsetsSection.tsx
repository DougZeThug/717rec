import { Zap } from 'lucide-react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WeeklyUpset } from '@/services/WeeklyRecapService';
import { typeScale } from '@/styles/design-system';
import { toTeamSlug } from '@/utils/teamSlug';

import MobileSectionShell from './WeeklyRecapMobileSectionShell';
import { UpsetRowProps } from './weeklyRecapTypes';

function UpsetRow({ upset, winter }: UpsetRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Link
          to={`/teams/${toTeamSlug(upset.winnerName)}`}
          className="flex items-center gap-1.5 group min-w-0"
        >
          <TeamLogo imageUrl={upset.winnerLogoUrl} teamName={upset.winnerName} size="xs" />
          <span
            className={cn(
              typeScale.body,
              'font-medium truncate transition-colors',
              winter
                ? 'text-cyan-50 group-hover:text-cyan-300'
                : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
            )}
          >
            {upset.winnerName}
          </span>
        </Link>
        <span className="text-muted-foreground/60 text-xs shrink-0">def.</span>
        <Link
          to={`/teams/${toTeamSlug(upset.loserName)}`}
          className="flex items-center gap-1.5 group min-w-0"
        >
          <TeamLogo imageUrl={upset.loserLogoUrl} teamName={upset.loserName} size="xs" />
          <span
            className={cn(
              typeScale.body,
              'truncate transition-colors',
              winter
                ? 'text-cyan-100/70 group-hover:text-cyan-300'
                : 'text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400'
            )}
          >
            {upset.loserName}
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1.5 pl-6">
        {upset.matchResult && (
          <span className="text-xs tabular-nums text-muted-foreground">{upset.matchResult}</span>
        )}
        <Badge
          variant="outline"
          className="text-xs border-yellow-500/40 text-yellow-600 dark:text-yellow-400 gap-1"
        >
          <Zap size={10} className="fill-yellow-500/50" />
          Upset +{upset.powerScoreGap.toFixed(1)}
        </Badge>
      </div>
    </div>
  );
}

function MobileUpsetRow({ upset, winter }: UpsetRowProps) {
  return <UpsetMobileContent upset={upset} winter={winter} />;
}
function UpsetMobileContent({ upset, winter }: UpsetRowProps) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex flex-col gap-1 min-w-0">
        <Link
          to={`/teams/${toTeamSlug(upset.winnerName)}`}
          className="flex items-center gap-1.5 group min-w-0"
        >
          <TeamLogo imageUrl={upset.winnerLogoUrl} teamName={upset.winnerName} size="xs" />
          <span
            className={cn(
              'text-xs font-medium transition-colors leading-tight',
              winter
                ? 'text-cyan-50 group-hover:text-cyan-300'
                : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
            )}
          >
            {upset.winnerName}
          </span>
        </Link>
        <Link
          to={`/teams/${toTeamSlug(upset.loserName)}`}
          className="flex items-center gap-1.5 group min-w-0"
        >
          <TeamLogo imageUrl={upset.loserLogoUrl} teamName={upset.loserName} size="xs" />
          <span
            className={cn(
              'text-xs transition-colors leading-tight',
              winter
                ? 'text-cyan-100/70 group-hover:text-cyan-300'
                : 'text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400'
            )}
          >
            {upset.loserName}
          </span>
        </Link>
      </div>
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        {upset.matchResult && (
          <span className="text-xs font-bold tabular-nums">{upset.matchResult}</span>
        )}
        <span className="text-[9px] font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-500/15 px-1.5 py-0.5 rounded whitespace-nowrap">
          +{upset.powerScoreGap.toFixed(1)} Upset
        </span>
      </div>
    </div>
  );
}

function UpsetsSection({ upsets, winter }: { upsets: WeeklyUpset[]; winter: boolean }) {
  if (upsets.length === 0) return null;
  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        <MobileSectionShell
          icon={<Zap size={12} className="text-yellow-500 fill-yellow-500/50" />}
          title="Top Upsets"
        >
          {upsets.map((upset) => (
            <MobileUpsetRow key={upset.winnerId + upset.loserId} upset={upset} winter={winter} />
          ))}
        </MobileSectionShell>
      </div>
      <section className="hidden md:block space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={13} className="text-yellow-500 fill-yellow-500/50" />
          <span
            className={cn(
              typeScale.caption,
              'font-semibold uppercase tracking-wider text-muted-foreground'
            )}
          >
            Upsets
          </span>
        </div>
        {upsets.map((upset) => (
          <UpsetRow key={upset.winnerId + upset.loserId} upset={upset} winter={winter} />
        ))}
      </section>
    </>
  );
}

export default UpsetsSection;
