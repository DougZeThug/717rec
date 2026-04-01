import { Trophy } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import { cn } from '@/lib/utils';
import { blueAmber } from '@/styles/design-system';
import { ICON_SIZES, ICON_STROKE } from '@/styles/icon-system';
import { Team } from '@/types';

interface ChampionDisplayProps {
  championId?: string;
  teams: Team[];
}

const ChampionDisplay: React.FC<ChampionDisplayProps> = ({ championId, teams }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  if (!championId) return null;

  const champion = teams.find((team) => team.id === championId);
  if (!champion) return null;

  return (
    <div
      className={cn(
        'py-6 px-4 text-center',
        isLight
          ? 'bg-gradient-to-r from-blue-50 via-amber-50/50 to-blue-50'
          : 'bg-gradient-to-r from-gray-900 via-gray-800/50 to-gray-900'
      )}
    >
      <div className="max-w-md mx-auto">
        <div
          className={cn(
            'inline-flex items-center justify-center p-2 mb-2 rounded-full',
            isLight
              ? 'bg-gradient-to-r from-amber-100 to-amber-200'
              : 'bg-gradient-to-r from-amber-900/30 to-amber-800/20'
          )}
        >
          <SeasonalIcon
            defaultIcon={Trophy}
            winterGlyph="frozen-trophy"
            size={ICON_SIZES.xl}
            strokeWidth={ICON_STROKE.light}
            className="text-amber-500"
          />
        </div>
        <h3
          className={cn(
            'text-xl font-bold mb-2',
            blueAmber.text.heading,
            'text-gradient-winter-glow'
          )}
        >
          Tournament Champion
        </h3>
        <div
          className={cn(
            'flex items-center justify-center gap-3 p-4 rounded-lg',
            isLight
              ? 'bg-white shadow-sm border border-amber-200'
              : 'bg-gray-800/50 border border-amber-900/30'
          )}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
            {(champion.imageUrl || champion.logoUrl) && (
              <img
                src={champion.imageUrl || champion.logoUrl}
                alt={champion.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_TEAM_IMAGE;
                }}
              />
            )}
          </div>
          <div className="text-left">
            <h4 className="font-bold text-lg">{champion.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {champion.divisionName || 'Division Winner'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChampionDisplay;
