import { m } from 'framer-motion';
import { Calendar, Shuffle, Users } from 'lucide-react';
import React from 'react';

import BlindDrawSignupForm from '@/components/home/BlindDrawSignupForm';
import { Card, CardContent } from '@/components/ui/card';
import { useBlindDrawSignupCount } from '@/hooks/useBlindDrawSignups';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useStartCountdown } from '@/hooks/useStartCountdown';
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

interface EventMetadata {
  isActiveEvent: boolean;
  checkInTimeStr: string;
  startTimeStr: string;
  buyIn: string;
  payouts: string;
  pastWinners: WeekWinners[];
}

const parseEventMetadata = (card: HeroCard): EventMetadata => {
  const metadata = card.metadata || {};
  return {
    isActiveEvent: (metadata.is_active_event as boolean) ?? false,
    checkInTimeStr: metadata.check_in_time as string,
    startTimeStr: metadata.start_time as string,
    buyIn: (metadata.buy_in as string) || '$10',
    payouts: (metadata.payouts as string) || 'Top 3',
    pastWinners: (metadata.past_winners as WeekWinners[]) || [],
  };
};

const EventBackdrop: React.FC<{ shouldApplyWinter: boolean }> = ({ shouldApplyWinter }) => (
  <>
    {/* Static background elements */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-4 right-8">
        <Shuffle
          className={cn('size-24', shouldApplyWinter ? 'text-cyan-300/30' : 'text-white/30')}
        />
      </div>
      <div className="absolute bottom-4 left-8">
        <Shuffle
          className={cn(
            'size-16 rotate-45',
            shouldApplyWinter ? 'text-cyan-300/20' : 'text-white/20'
          )}
        />
      </div>
    </div>

    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
  </>
);

interface EventSubtitleBadgeProps {
  subtitle: string | null;
  isActiveEvent: boolean;
  checkInTimeStr: string;
  shouldApplyWinter: boolean;
}

const EventSubtitleBadge: React.FC<EventSubtitleBadgeProps> = ({
  subtitle,
  isActiveEvent,
  checkInTimeStr,
  shouldApplyWinter,
}) => {
  if (!isActiveEvent && !subtitle) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 backdrop-blur-xs rounded-full px-3 py-1',
        shouldApplyWinter ? 'bg-cyan-500/20' : 'bg-white/20'
      )}
    >
      <Calendar className="size-4" />
      <span className="font-inter font-semibold text-sm">
        {isActiveEvent ? subtitle || formatDate(checkInTimeStr, '') : subtitle}
      </span>
    </div>
  );
};

interface BlindDrawSignupSectionProps {
  eventDate: string;
  signupCount: number | undefined;
  shouldApplyWinter: boolean;
}

const BlindDrawSignupSection: React.FC<BlindDrawSignupSectionProps> = ({
  eventDate,
  signupCount,
  shouldApplyWinter,
}) => (
  <div className="w-full mt-3 space-y-2">
    {signupCount !== undefined && signupCount > 0 && (
      <div
        className={cn(
          'flex items-center justify-center gap-2 backdrop-blur-xs rounded-full px-3 py-1.5 w-fit mx-auto',
          shouldApplyWinter ? 'bg-cyan-500/20' : 'bg-white/20'
        )}
      >
        <Users className={cn('size-4', shouldApplyWinter ? 'text-cyan-300' : 'text-emerald-300')} />
        <span className="font-inter font-semibold text-sm tabular-nums">
          {signupCount} signed up
        </span>
      </div>
    )}
    <BlindDrawSignupForm eventDate={eventDate} />
  </div>
);

const EventHeroCard: React.FC<EventHeroCardProps> = ({ card }) => {
  const { shouldApplyWinter } = useSeasonalTheme();

  const { isActiveEvent, checkInTimeStr, startTimeStr, buyIn, payouts, pastWinners } =
    parseEventMetadata(card);

  const eventDate = startTimeStr ? getEventDateEST(startTimeStr) : null;
  const { data: signupCount } = useBlindDrawSignupCount(eventDate ?? undefined);
  const startCountdown = useStartCountdown(startTimeStr);

  const showCountdown = isActiveEvent && !!startTimeStr;

  return (
    <m.div
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
        <EventBackdrop shouldApplyWinter={shouldApplyWinter} />

        <CardContent className="relative z-10 p-4 md:p-6">
          <div
            className={cn(
              'flex flex-col md:flex-row md:gap-8',
              shouldApplyWinter ? 'text-cyan-50' : 'text-white'
            )}
          >
            {/* Left Column - Header, Date, Countdown (desktop) */}
            <div className="flex flex-col items-center text-center space-y-3 md:w-1/3 md:shrink-0">
              <div className="flex items-center gap-2">
                <m.div
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="size-6 md:size-8" />
                </m.div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wide">
                  {card.title}
                </h2>
                <m.div
                  initial={{ rotate: 10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="size-6 md:size-8" />
                </m.div>
              </div>

              <EventSubtitleBadge
                subtitle={card.subtitle}
                isActiveEvent={isActiveEvent}
                checkInTimeStr={checkInTimeStr}
                shouldApplyWinter={shouldApplyWinter}
              />

              {showCountdown && (
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

              <PastWinnersDisplay pastWinners={pastWinners} shouldApplyWinter={shouldApplyWinter} />

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

              {showCountdown && (
                <EventCountdown
                  text={startCountdown.text}
                  percent={startCountdown.percent}
                  shouldApplyWinter={shouldApplyWinter}
                  className="md:hidden w-full max-w-sm mt-2"
                />
              )}

              {isActiveEvent && card.slug === 'blind-draw' && eventDate && (
                <BlindDrawSignupSection
                  eventDate={eventDate}
                  signupCount={signupCount}
                  shouldApplyWinter={shouldApplyWinter}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default React.memo(EventHeroCard);
