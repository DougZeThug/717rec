import { motion } from 'framer-motion';
import { Clock, DollarSign, Trophy } from 'lucide-react';
import React from 'react';

import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { cn } from '@/lib/utils';

interface EventDetailsProps {
  checkInTimeStr: string;
  startTimeStr: string;
  buyIn: string;
  payouts: string;
  shouldApplyWinter: boolean;
}

const formatTime = (isoString: string) => {
  if (!isoString) return 'TBD';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
};

const EventDetails: React.FC<EventDetailsProps> = ({
  checkInTimeStr,
  startTimeStr,
  buyIn,
  payouts,
  shouldApplyWinter,
}) => {
  const tileClasses = cn(
    'flex flex-col items-center gap-0.5 backdrop-blur-sm rounded-lg p-2 md:p-3 border transition-all',
    shouldApplyWinter
      ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border-cyan-400/20 hover:border-cyan-400/40'
      : 'bg-gradient-to-br from-white/15 to-white/5 border-white/20 hover:border-white/40'
  );

  const labelClasses = cn(
    'text-[10px] font-bebas uppercase tracking-wide',
    shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">
      <motion.div whileHover={{ scale: 1.03 }} className={tileClasses}>
        <Clock
          className={cn(
            'h-4 w-4 md:h-5 md:w-5',
            shouldApplyWinter ? 'text-cyan-300' : 'text-yellow-300'
          )}
        />
        <span className={labelClasses}>Check-in</span>
        <span className="text-base md:text-lg font-bebas tabular-nums">
          {formatTime(checkInTimeStr)}
        </span>
      </motion.div>

      <motion.div whileHover={{ scale: 1.03 }} className={tileClasses}>
        <Clock
          className={cn(
            'h-4 w-4 md:h-5 md:w-5',
            shouldApplyWinter ? 'text-emerald-300' : 'text-green-300'
          )}
        />
        <span className={labelClasses}>Start</span>
        <span className="text-base md:text-lg font-bebas tabular-nums">
          {formatTime(startTimeStr)}
        </span>
      </motion.div>

      <motion.div whileHover={{ scale: 1.03 }} className={tileClasses}>
        <DollarSign
          className={cn(
            'h-4 w-4 md:h-5 md:w-5',
            shouldApplyWinter ? 'text-emerald-300' : 'text-emerald-300'
          )}
        />
        <span className={labelClasses}>Buy-in</span>
        <span className="text-base md:text-lg font-bebas">{buyIn}</span>
      </motion.div>

      <motion.div whileHover={{ scale: 1.03 }} className={tileClasses}>
        <SeasonalIcon
          defaultIcon={Trophy}
          winterGlyph="frozen-trophy"
          size={20}
          className={cn(
            'h-4 w-4 md:h-5 md:w-5',
            shouldApplyWinter ? 'text-amber-300' : 'text-amber-300'
          )}
        />
        <span className={labelClasses}>Payouts</span>
        <span className="text-base md:text-lg font-bebas">{payouts}</span>
      </motion.div>
    </div>
  );
};

export default EventDetails;
