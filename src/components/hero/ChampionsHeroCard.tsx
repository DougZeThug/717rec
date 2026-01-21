import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
import React from 'react';

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { HeroCard } from '@/types/heroCard';

interface ChampionsHeroCardProps {
  card: HeroCard;
}

interface TeamData {
  id: string;
  name: string;
  image_url: string | null;
}

const ChampionCardCompact: React.FC<{
  team: TeamData;
  division: string;
  isWinter?: boolean;
}> = ({ team, division, isWinter }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className={cn(
        'flex flex-col items-center backdrop-blur-sm rounded-xl p-3 w-[130px]',
        isWinter ? 'bg-amber-900/30' : 'bg-white/10'
      )}
    >
      <p
        className={cn(
          'text-[10px] font-bebas uppercase tracking-wide mb-2 text-center',
          isWinter ? 'text-amber-200/80' : 'text-white/80'
        )}
      >
        {division}
      </p>
      <div className="relative mb-2">
        <div
          className={cn(
            'ring-2 rounded-lg p-0.5',
            isWinter ? 'ring-amber-400/40 bg-amber-900/30' : 'ring-white/40 bg-white/20'
          )}
        >
          {team.image_url ? (
            <img
              src={team.image_url}
              alt={`${division} champion`}
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={cn(
                'h-14 w-14 rounded-lg flex items-center justify-center',
                isWinter ? 'bg-amber-900/30' : 'bg-white/20'
              )}
            >
              <Trophy className={cn('w-6 h-6', isWinter ? 'text-amber-300/70' : 'text-white/70')} />
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute -top-1 -right-1 rounded-full p-0.5 backdrop-blur-sm',
            isWinter ? 'bg-amber-500/40' : 'bg-white/30'
          )}
        >
          <Crown className={cn('w-2.5 h-2.5', isWinter ? 'text-amber-200' : 'text-white')} />
        </div>
      </div>
      <p
        className={cn(
          'font-inter font-semibold text-xs text-center line-clamp-2',
          isWinter ? 'text-amber-50' : 'text-white'
        )}
      >
        {team.name}
      </p>
    </motion.div>
  );
};

const ChampionDisplay = React.forwardRef<
  HTMLDivElement,
  {
    team: TeamData;
    division: string;
    isWinter?: boolean;
  }
>(({ team, division, isWinter }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 group p-2 rounded-lg transition-colors duration-200',
        isWinter ? 'hover:bg-amber-800/20' : 'hover:bg-white/10'
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'ring-4 rounded-lg p-1 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105',
            isWinter ? 'ring-amber-400/40 bg-amber-900/30' : 'ring-white/40 bg-white/20'
          )}
        >
          {team.image_url ? (
            <img
              src={team.image_url}
              alt={`${division} champion logo for ${team.name}`}
              width={80}
              height={80}
              loading="lazy"
              className="h-20 w-20 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={cn(
                'h-20 w-20 rounded-lg flex items-center justify-center',
                isWinter ? 'bg-amber-900/30' : 'bg-white/20'
              )}
            >
              <Trophy
                className={cn('w-10 h-10', isWinter ? 'text-amber-300/70' : 'text-white/70')}
              />
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute -top-1 -right-1 rounded-full p-1 backdrop-blur-sm',
            isWinter ? 'bg-amber-500/40' : 'bg-white/30'
          )}
        >
          <Crown className={cn('w-3 h-3', isWinter ? 'text-amber-200' : 'text-white')} />
        </div>
      </div>

      <div className="flex-1">
        <p
          className={cn(
            'text-xs font-bebas uppercase tracking-wide mb-1',
            isWinter ? 'text-amber-200/80' : 'text-white/80'
          )}
        >
          Champion
        </p>
        <p
          className={cn(
            'font-inter font-semibold text-sm',
            isWinter ? 'text-amber-50' : 'text-white'
          )}
        >
          {team.name}
        </p>
      </div>
    </div>
  );
});
ChampionDisplay.displayName = 'ChampionDisplay';

const ChampionsHeroCard: React.FC<ChampionsHeroCardProps> = ({ card }) => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const championsMap = (card.metadata?.champions as Record<string, string>) || {};
  const championIds = Object.values(championsMap);

  const { data, isLoading, error } = useQuery({
    queryKey: ['champions', championIds],
    queryFn: async () => {
      if (championIds.length === 0) return { teams: [], divisionMap: {} };

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', championIds);

      if (error) throw error;

      const divisionMap: Record<string, string> = {};
      Object.entries(championsMap).forEach(([division, teamId]) => {
        divisionMap[teamId] = division;
      });

      return { teams: data as TeamData[], divisionMap };
    },
    enabled: championIds.length > 0,
  });

  const sectionClasses = cn(
    'relative rounded-2xl shadow-2xl hover:shadow-3xl p-4 md:p-6 transition-shadow duration-200',
    shouldApplyWinter
      ? 'champions-card winter-card-full overflow-visible'
      : 'overflow-hidden bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500',
    animations.fadeIn
  );

  if (isLoading) {
    return (
      <section className={cn(sectionClasses, 'animate-pulse')}>
        <div className="h-6 bg-white/20 rounded mb-4 w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <div className="h-3 bg-white/20 rounded w-24 mb-2"></div>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 bg-white/20 rounded-lg"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-white/20 rounded w-16"></div>
                  <div className="h-4 bg-white/20 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className={sectionClasses}>
        <h2
          className={cn(
            'text-xl md:text-2xl font-bold mb-4 flex items-center gap-2',
            shouldApplyWinter ? 'text-amber-50' : 'text-white'
          )}
        >
          <Trophy className="w-6 h-6" />
          Champions - Error Loading
        </h2>
        <p className={shouldApplyWinter ? 'text-amber-200/80' : 'text-white/80'}>
          Unable to load champions. Please try again later.
        </p>
      </section>
    );
  }

  const divisionPriority: Record<string, number> = {
    Competitive: 1,
    'Intermediate 1': 2,
    'Intermediate 2': 3,
    Recreational: 4,
  };

  const divisionOrder = Object.keys(championsMap).sort((a, b) => {
    const priorityA = divisionPriority[a] ?? 99;
    const priorityB = divisionPriority[b] ?? 99;
    return priorityA - priorityB;
  });

  return (
    <motion.section
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className={sectionClasses}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className={cn('w-6 h-6', shouldApplyWinter ? 'text-amber-200' : 'text-white')} />
        <h2
          className={cn(
            'text-xl md:text-2xl font-bebas uppercase tracking-wide',
            shouldApplyWinter ? 'text-amber-50' : 'text-white'
          )}
        >
          {card.title.replace(/🏆\s*/g, '')}
        </h2>
      </div>

      {/* Mobile Carousel */}
      <div className="block md:hidden">
        <Carousel
          opts={{ align: 'start', loop: false, dragFree: true, skipSnaps: true, duration: 20 }}
        >
          <CarouselContent className="-ml-2">
            {divisionOrder.map((divisionName) => {
              const teamId = championsMap[divisionName];
              const team = data.teams.find((t) => t.id === teamId);
              if (!team) return null;

              return (
                <CarouselItem key={divisionName} className="pl-2 basis-[140px]">
                  <ChampionCardCompact
                    team={team}
                    division={divisionName}
                    isWinter={shouldApplyWinter}
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
        <p
          className={cn(
            'text-xs text-center mt-3',
            shouldApplyWinter ? 'text-amber-200/60' : 'text-white/60'
          )}
        >
          Swipe to see all champions →
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid grid-cols-2 gap-4 md:gap-6">
        {divisionOrder.map((divisionName) => {
          const teamId = championsMap[divisionName];
          const team = data.teams.find((t) => t.id === teamId);

          if (!team) return null;

          return (
            <div
              key={divisionName}
              className={cn(
                'backdrop-blur-sm rounded-xl p-3 md:p-4',
                shouldApplyWinter ? 'bg-amber-900/30' : 'bg-white/10'
              )}
            >
              <h3
                className={cn(
                  'text-xs uppercase tracking-wide text-center mb-2 font-bebas',
                  shouldApplyWinter ? 'text-amber-200/80' : 'text-white/80'
                )}
              >
                {divisionName}
              </h3>
              <ChampionDisplay team={team} division={divisionName} isWinter={shouldApplyWinter} />
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default React.memo(ChampionsHeroCard);
