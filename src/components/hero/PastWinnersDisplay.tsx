import { Medal } from 'lucide-react';
import React from 'react';

import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { cn } from '@/lib/utils';

interface Winner {
  place: number;
  names: string;
}

interface WeekWinners {
  week: number;
  winners: Winner[];
}

interface PastWinnersDisplayProps {
  pastWinners: WeekWinners[];
  shouldApplyWinter: boolean;
}

const placeEmojis = ['🥇', '🥈', '🥉'];

const PastWinnersDisplay: React.FC<PastWinnersDisplayProps> = ({
  pastWinners,
  shouldApplyWinter,
}) => {
  if (pastWinners.length === 0) return null;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-center md:justify-start gap-2">
        <SeasonalIcon
          defaultIcon={Medal}
          winterGlyph="frozen-trophy"
          size={16}
          className={cn('h-4 w-4', shouldApplyWinter ? 'text-amber-300' : 'text-amber-300')}
        />
        <span className="font-bebas uppercase tracking-wide text-sm">Past Winners</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {pastWinners.map((weekData) => (
          <div
            key={weekData.week}
            className={cn(
              'backdrop-blur-sm rounded-lg p-2 border',
              shouldApplyWinter
                ? 'bg-cyan-500/10 border-cyan-400/10'
                : 'bg-white/10 border-white/10'
            )}
          >
            <div
              className={cn(
                'text-[10px] font-bebas uppercase tracking-wide text-center mb-1',
                shouldApplyWinter ? 'text-cyan-200/70' : 'text-white/70'
              )}
            >
              Week {weekData.week}
            </div>
            {weekData.winners.length > 0 ? (
              <div className="space-y-0.5 text-xs font-inter">
                {weekData.winners.map((winner) => (
                  <div
                    key={winner.place}
                    className="flex items-center gap-1 justify-center md:justify-start"
                  >
                    <span>{placeEmojis[winner.place - 1] || `#${winner.place}`}</span>
                    <span>{winner.names}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  'flex items-center justify-center h-10 text-xs font-inter',
                  shouldApplyWinter ? 'text-cyan-300/50' : 'text-white/50'
                )}
              >
                TBD
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PastWinnersDisplay;
