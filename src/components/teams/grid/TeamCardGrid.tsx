import { Edit, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityCard } from '@/components/ui/entity-card';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Team } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

import { TeamImage } from '../shared/TeamImage';

interface TeamCardGridProps {
  team: Team;
  onDelete?: (id: string) => void;
  onEdit?: (team: Team) => void;
}

export const TeamCardGrid: React.FC<TeamCardGridProps> = ({ team, onDelete, onEdit }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');
  const isMobile = useIsMobile();
  const { isWinterTheme } = useSeasonalTheme();

  const headerGradient = isWinterTheme
    ? 'bg-transparent'
    : 'bg-gradient-to-br from-blue-50 via-gray-50 to-orange-50/20 dark:from-gray-800/70 dark:via-gray-800/80 dark:to-gray-800/70';
  const contentGradient = isWinterTheme
    ? 'bg-transparent'
    : 'bg-gradient-to-br from-white to-gray-50/70 dark:from-gray-900 dark:to-gray-900/90';

  return (
    <EntityCard division={team.divisionName}>
      <Link to={`/teams/${toTeamSlug(team.name)}`} className="block">
        <div
          className={cn(
            'relative flex items-center justify-center overflow-hidden',
            isMobile ? 'h-20 p-4' : 'h-24 p-3',
            headerGradient
          )}
        >
          <TeamImage
            imageUrl={team.imageUrl || team.logoUrl}
            teamName={team.name}
            size="sm"
            className={cn('object-contain w-auto', isMobile ? 'max-h-12' : 'max-h-20')}
          />
        </div>
      </Link>

      <div
        className={cn(
          'flex flex-col flex-grow',
          isMobile ? 'p-1.5' : 'p-2 sm:p-3',
          contentGradient
        )}
      >
        <div className="flex justify-between items-start">
          <Link to={`/teams/${toTeamSlug(team.name)}`} className="hover:underline flex-1 min-w-0">
            <h3
              className={cn(
                'font-bebas font-normal uppercase tracking-wide truncate text-foreground',
                isMobile ? 'text-sm' : 'text-base sm:text-lg'
              )}
              title={team.name}
            >
              {team.name}
            </h3>
          </Link>

          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-1 -mr-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreHorizontal size={16} />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                {isAdminPage && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(team)} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {isAdminPage && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(team.id)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={`/teams/${toTeamSlug(team.name)}`}>
                    <ExternalLink className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile: Single line of info (record only) */}
        {isMobile ? (
          <span className="text-xs text-muted-foreground font-mono">
            {team.wins}-{team.losses}
          </span>
        ) : (
          <>
            {team.divisionName && (
              <Badge
                variant={
                  team.divisionName.toLowerCase().includes('hidden')
                    ? 'secondary'
                    : team.divisionName.toLowerCase().includes('competitive')
                      ? 'competitive'
                      : team.divisionName.toLowerCase().includes('intermediate')
                        ? 'intermediate'
                        : 'recreational'
                }
                className={cn(
                  'self-start mb-2 font-inter uppercase text-xs tracking-widest',
                  team.divisionName.toLowerCase().includes('hidden') &&
                    'bg-muted text-muted-foreground border-muted'
                )}
              >
                {team.divisionName}
              </Badge>
            )}

            <div className="grid grid-cols-2 gap-1 text-xs">
              <div
                className={cn(
                  'rounded p-1.5',
                  isWinterTheme
                    ? 'bg-white/5 border border-frost-border/20'
                    : 'bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 dark:from-gray-800/90 dark:to-gray-900/80'
                )}
              >
                <div className="text-[10px] text-muted-foreground uppercase">Record</div>
                <span className="font-mono text-sm">
                  {team.wins}-{team.losses}
                </span>
              </div>
              <div
                className={cn(
                  'rounded p-1.5',
                  isWinterTheme
                    ? 'bg-white/5 border border-frost-border/20'
                    : 'bg-gradient-to-br from-white via-white to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/80'
                )}
              >
                <div className="text-[10px] text-muted-foreground uppercase">Power</div>
                <span className="font-mono text-sm">
                  {typeof team.power_score === 'number' ? team.power_score.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </EntityCard>
  );
};
