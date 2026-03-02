import { motion } from 'framer-motion';
import { Calendar, Shuffle, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import BlindDrawSignupForm from '@/components/home/BlindDrawSignupForm';
import { Card, CardContent } from '@/components/ui/card';
import { useBlindDrawSignupCount } from '@/hooks/useBlindDrawSignups';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { HeroCard } from '@/types/heroCard';

import EventCountdown from './EventCountdown';
import EventDetails from './EventDetails';
import PastWinnersDisplay from './PastWinnersDisplay';

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

const formatDate = (isoString: string, fallback: string) => {
  if (!isoString) return fallback;
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
};

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

const EventHeroCard: React.FC<EventHeroCardProps> = ({ card }) => {
  const [startCountdown, setStartCountdown] = useState({ text: '', percent: 0 });
  const { shouldApplyWinter } = useSeasonalTheme();

  const metadata = card.metadata || {};
  const isActiveEvent = (metadata.is_active_event as boolean) ?? false;
  const checkInTimeStr = metadata.check_in_time as string;
  const startTimeStr = metadata.start_time as string;
  const buyIn = (metadata.buy_in as string) || '$10';
  const payouts = (metadata.payouts as string) || 'Top 3';
  const pastWinners = (metadata.past_winners as WeekWinners[]) || [];

  const eventDate = startTimeStr ? getEventDateEST(startTimeStr) : null;
  const { data: signupCount } = useBlindDrawSignupCount();

  useEffect(() => {
    if (!startTimeStr) return;

    const startTime = new Date(startTimeStr);
    const maxDiff = 12 * 60 * 60 * 1000;

    const updateCountdown = () => {
      const now = new Date();
      const startDiff = startTime.getTime() - now.getTime();

      if (startDiff > 0) {
        const hours = Math.floor(startDiff / (1000 * 60 * 60));
        const minutes = Math.floor((startDiff % (1000 * 60 * 60)) / (1000 * 60));
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

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 60000);
    return () => clearInterval(intervalId);
  }, [startTimeStr]);

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

        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />

        <CardContent className="relative z-10 p-4 md:p-6">
          <div
            className={cn(
              'flex flex-col md:flex-row md:gap-8',
              shouldApplyWinter ? 'text-cyan-50' : 'text-white'
            )}
          >
            {/* Left Column - Header, Date, Countdown (desktop) */}
            <div className="flex flex-col items-center text-center space-y-3 md:w-1/3 md:flex-shrink-0">
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
                      ? card.subtitle || formatDate(checkInTimeStr, '')
                      : card.subtitle}
                  </span>
                </div>
              )}

              {isActiveEvent && startTimeStr && (
                <EventCountdown
                  text={startCountdown.text}
                  percent={startCountdown.percent}
                  shouldApplyWinter={shouldApplyWinter}
                  className="hidden md:block w-full mt-2"
                />
              )}
            </div>

            {/* Right Column - Details, Winners, Signup */}
            <div className="flex-1 flex flex-col items-center md:items-stretch space-y-3 mt-4 md:mt-0">
              {isActiveEvent && (
                <EventDetails
                  checkInTimeStr={checkInTimeStr}
                  startTimeStr={startTimeStr}
                  buyIn={buyIn}
                  payouts={payouts}
                  shouldApplyWinter={shouldApplyWinter}
                />
              )}

              <PastWinnersDisplay
                pastWinners={pastWinners}
                shouldApplyWinter={shouldApplyWinter}
              />

              {card.body && (
                <p
                  className={cn(
                    'text-sm font-inter text-center md:text-left',
                    shouldApplyWinter ? 'text-cyan-200/80' : 'text-white/80'
                  )}
                >
                  {card.body}
                </p>
              )}

              {isActiveEvent && startTimeStr && (
                <EventCountdown
                  text={startCountdown.text}
                  percent={startCountdown.percent}
                  shouldApplyWinter={shouldApplyWinter}
                  className="md:hidden w-full max-w-sm mt-2"
                />
              )}

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
