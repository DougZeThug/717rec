import { motion } from 'framer-motion';
import { Calendar, Clock, DollarSign, Medal, Shuffle, Timer, Trophy, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import BlindDrawSignupForm from '@/components/home/BlindDrawSignupForm';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { useBlindDrawSignupCount } from '@/hooks/useBlindDrawSignups';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { HeroCard } from '@/types/heroCard';

interface EventHeroCardProps {
  card: HeroCard;
}

interface Winner {
  place: number;
  names: string;
}

interface WeekWinners {
  week: number;
  winners: Winner[];
}

const EventHeroCard: React.FC<EventHeroCardProps> = ({ card }) => {
  const [checkInCountdown, setCheckInCountdown] = useState({ text: '', percent: 0 });
  const [startCountdown, setStartCountdown] = useState({ text: '', percent: 0 });
  const { shouldApplyWinter } = useSeasonalTheme();

  const metadata = card.metadata || {};
  const isActiveEvent = (metadata.is_active_event as boolean) ?? false;
  const checkInTimeStr = metadata.check_in_time as string;
  const startTimeStr = metadata.start_time as string;
  const buyIn = (metadata.buy_in as string) || '$10';
  const payouts = (metadata.payouts as string) || 'Top 3';
  const pastWinners = (metadata.past_winners as WeekWinners[]) || [];

  const getEventDateEST = (isoString: string): string | null => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const eventDate = startTimeStr ? getEventDateEST(startTimeStr) : null;
  const { data: signupCount } = useBlindDrawSignupCount();

  useEffect(() => {
    if (!checkInTimeStr || !startTimeStr) return;

    const checkInTime = new Date(checkInTimeStr);
    const startTime = new Date(startTimeStr);

    const updateCountdowns = () => {
      const now = new Date();

      const checkInDiff = checkInTime.getTime() - now.getTime();
      if (checkInDiff > 0) {
        const hours = Math.floor(checkInDiff / (1000 * 60 * 60));
        const minutes = Math.floor((checkInDiff % (1000 * 60 * 60)) / (1000 * 60));
        const maxDiff = 12 * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, 100 - (checkInDiff / maxDiff) * 100));

        if (hours > 0) {
          setCheckInCountdown({ text: `${hours}h ${minutes}m until check-in`, percent });
        } else if (minutes > 0) {
          setCheckInCountdown({ text: `${minutes}m until check-in`, percent });
        } else {
          setCheckInCountdown({ text: 'Check-in open now!', percent: 100 });
        }
      } else {
        setCheckInCountdown({ text: 'Check-in open now!', percent: 100 });
      }

      const startDiff = startTime.getTime() - now.getTime();
      if (startDiff > 0) {
        const hours = Math.floor(startDiff / (1000 * 60 * 60));
        const minutes = Math.floor((startDiff % (1000 * 60 * 60)) / (1000 * 60));
        const maxDiff = 12 * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, 100 - (startDiff / maxDiff) * 100));

        if (hours > 0) {
          setStartCountdown({ text: `${hours}h ${minutes}m until start`, percent });
        } else if (minutes > 0) {
          setStartCountdown({ text: `${minutes}m until start`, percent });
        } else {
          setStartCountdown({ text: 'Starting now!', percent: 100 });
        }
      } else {
        setStartCountdown({ text: 'Event started!', percent: 100 });
      }
    };

    updateCountdowns();
    const intervalId = setInterval(updateCountdowns, 60000);
    return () => clearInterval(intervalId);
  }, [checkInTimeStr, startTimeStr]);

  const formatTime = (isoString: string) => {
    if (!isoString) return 'TBD';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return card.subtitle || '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    });
  };

  const placeEmojis = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'relative shadow-2xl hover:shadow-3xl transition-shadow duration-200',
          'border-t-4',
          shouldApplyWinter
            ? cn(
                'event-card winter-card-full overflow-visible',
                'border-t-cyan-400',
                'border border-emerald-500/20'
              )
            : cn(
                'overflow-hidden',
                'border-t-emerald-400 dark:border-t-emerald-500',
                'border border-emerald-200 dark:border-white/20',
                'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-800'
              )
        )}
      >
        {/* Static background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8">
            <Shuffle
              className={cn('h-24 w-24', shouldApplyWinter ? 'text-cyan-300/30' : 'text-white/30')}
            />
          </div>
          <div className="absolute bottom-4 left-8">
            <Shuffle
              className={cn(
                'h-16 w-16 rotate-45',
                shouldApplyWinter ? 'text-cyan-300/20' : 'text-white/20'
              )}
            />
          </div>
        </div>

        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />

        <CardContent className="relative z-10 p-4 md:p-6">
          <div
            className={cn(
              'flex flex-col md:flex-row md:gap-8',
              shouldApplyWinter ? 'text-cyan-50' : 'text-white'
            )}
          >
            {/* Left Column - Header, Date, Countdowns */}
            <div className="flex flex-col items-center text-center space-y-3 md:w-1/3 md:flex-shrink-0">
              {/* Header with subtle entrance animation */}
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="h-6 w-6 md:h-8 md:w-8" />
                </motion.div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wide">
                  {card.title}
                </h2>
                <motion.div
                  initial={{ rotate: 10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="h-6 w-6 md:h-8 md:w-8" />
                </motion.div>
              </div>

              {/* Date badge - shown when active or when subtitle is set */}
              {(isActiveEvent || card.subtitle) && (
                <div
                  className={cn(
                    'inline-flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-1',
                    shouldApplyWinter ? 'bg-cyan-500/20' : 'bg-white/20'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="font-inter font-semibold text-sm">
                    {isActiveEvent
                      ? (card.subtitle || formatDate(checkInTimeStr))
                      : card.subtitle}
                  </span>
                </div>
              )}

              {/* Countdown bar - desktop only in left column, only for active events */}
              {isActiveEvent && startTimeStr && (
                <div className="hidden md:block w-full mt-2">
                  <div className="space-y-1">
                    <div
                      className={cn(
                        'flex items-center gap-2 text-xs font-inter',
                        shouldApplyWinter ? 'text-cyan-200/90' : 'text-white/90'
                      )}
                    >
                      <Timer
                        className={cn(
                          'h-3 w-3',
                          shouldApplyWinter ? 'text-cyan-300' : 'text-green-300'
                        )}
                      />
                      <span>{startCountdown.text}</span>
                    </div>
                    <Progress
                      value={startCountdown.percent}
                      className={cn(
                        'h-1.5',
                        shouldApplyWinter
                          ? 'bg-cyan-900/40 [&>div]:bg-cyan-400'
                          : 'bg-white/20 [&>div]:bg-green-400'
                      )}
                      aria-label="Event start countdown progress"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Event Details & Past Winners */}
            <div className="flex-1 flex flex-col items-center md:items-stretch space-y-3 mt-4 md:mt-0">
              {/* Event details grid - only shown for active events */}
              {isActiveEvent && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 backdrop-blur-sm rounded-lg p-2 md:p-3 border transition-all',
                      shouldApplyWinter
                        ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border-cyan-400/20 hover:border-cyan-400/40'
                        : 'bg-gradient-to-br from-white/15 to-white/5 border-white/20 hover:border-white/40'
                    )}
                  >
                    <Clock
                      className={cn(
                        'h-4 w-4 md:h-5 md:w-5',
                        shouldApplyWinter ? 'text-cyan-300' : 'text-yellow-300'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bebas uppercase tracking-wide',
                        shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                      )}
                    >
                      Check-in
                    </span>
                    <span className="text-base md:text-lg font-bebas tabular-nums">
                      {formatTime(checkInTimeStr)}
                    </span>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 backdrop-blur-sm rounded-lg p-2 md:p-3 border transition-all',
                      shouldApplyWinter
                        ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border-cyan-400/20 hover:border-cyan-400/40'
                        : 'bg-gradient-to-br from-white/15 to-white/5 border-white/20 hover:border-white/40'
                    )}
                  >
                    <Clock
                      className={cn(
                        'h-4 w-4 md:h-5 md:w-5',
                        shouldApplyWinter ? 'text-emerald-300' : 'text-green-300'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bebas uppercase tracking-wide',
                        shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                      )}
                    >
                      Start
                    </span>
                    <span className="text-base md:text-lg font-bebas tabular-nums">
                      {formatTime(startTimeStr)}
                    </span>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 backdrop-blur-sm rounded-lg p-2 md:p-3 border transition-all',
                      shouldApplyWinter
                        ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border-cyan-400/20 hover:border-cyan-400/40'
                        : 'bg-gradient-to-br from-white/15 to-white/5 border-white/20 hover:border-white/40'
                    )}
                  >
                    <DollarSign
                      className={cn(
                        'h-4 w-4 md:h-5 md:w-5',
                        shouldApplyWinter ? 'text-emerald-300' : 'text-emerald-300'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bebas uppercase tracking-wide',
                        shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                      )}
                    >
                      Buy-in
                    </span>
                    <span className="text-base md:text-lg font-bebas">{buyIn}</span>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 backdrop-blur-sm rounded-lg p-2 md:p-3 border transition-all',
                      shouldApplyWinter
                        ? 'bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border-cyan-400/20 hover:border-cyan-400/40'
                        : 'bg-gradient-to-br from-white/15 to-white/5 border-white/20 hover:border-white/40'
                    )}
                  >
                    <SeasonalIcon
                      defaultIcon={Trophy}
                      winterGlyph="frozen-trophy"
                      size={20}
                      className={cn(
                        'h-4 w-4 md:h-5 md:w-5',
                        shouldApplyWinter ? 'text-amber-300' : 'text-amber-300'
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bebas uppercase tracking-wide',
                        shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                      )}
                    >
                      Payouts
                    </span>
                    <span className="text-base md:text-lg font-bebas">{payouts}</span>
                  </motion.div>
                </div>
              )}

              {/* Past Winners */}
              {pastWinners.length > 0 && (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <SeasonalIcon
                      defaultIcon={Medal}
                      winterGlyph="frozen-trophy"
                      size={16}
                      className={cn(
                        'h-4 w-4',
                        shouldApplyWinter ? 'text-amber-300' : 'text-amber-300'
                      )}
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
              )}

              {/* Body text - shown when set */}
              {card.body && (
                <p className={cn(
                  'text-sm font-inter text-center md:text-left',
                  shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                )}>
                  {card.body}
                </p>
              )}

              {/* Countdown bar - mobile only, only for active events */}
              {isActiveEvent && startTimeStr && (
                <div className="md:hidden w-full max-w-sm mt-2">
                  <div className="space-y-1">
                    <div
                      className={cn(
                        'flex items-center gap-2 text-xs font-inter',
                        shouldApplyWinter ? 'text-cyan-200/90' : 'text-white/90'
                      )}
                    >
                      <Timer
                        className={cn(
                          'h-3 w-3',
                          shouldApplyWinter ? 'text-cyan-300' : 'text-green-300'
                        )}
                      />
                      <span>{startCountdown.text}</span>
                    </div>
                    <Progress
                      value={startCountdown.percent}
                      className={cn(
                        'h-1.5',
                        shouldApplyWinter
                          ? 'bg-cyan-900/40 [&>div]:bg-cyan-400'
                          : 'bg-white/20 [&>div]:bg-green-400'
                      )}
                      aria-label="Event start countdown progress"
                    />
                  </div>
                </div>
              )}

              {/* Signup Form - only for blind-draw events when active */}
              {isActiveEvent && card.slug === 'blind-draw' && eventDate && (
                <div className="w-full mt-3 space-y-2">
                  {signupCount !== undefined && signupCount > 0 && (
                    <div
                      className={cn(
                        'flex items-center justify-center gap-2 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit mx-auto',
                        shouldApplyWinter ? 'bg-cyan-500/20' : 'bg-white/20'
                      )}
                    >
                      <Users
                        className={cn(
                          'h-4 w-4',
                          shouldApplyWinter ? 'text-cyan-300' : 'text-emerald-300'
                        )}
                      />
                      <span className="font-inter font-semibold text-sm tabular-nums">
                        {signupCount} signed up
                      </span>
                    </div>
                  )}
                  <BlindDrawSignupForm eventDate={eventDate} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default React.memo(EventHeroCard);
