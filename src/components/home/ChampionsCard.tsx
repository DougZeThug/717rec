import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface TeamData {
  id: string;
  name: string;
  image_url: string | null;
}

interface DivisionData {
  id: string;
  label: string;
  winner_id: string;
  runner_up_id: string;
}

const useChampions = () => {
  const winners = [
    '77110b92-d2d8-495b-afed-cac65deb6253', // Offdogs
    '0c7261b9-db22-48d1-8487-ba9eeb90fbef', // Wrong Hole
    '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', // Buttery Nips
    '34b1dacf-0c30-4a4c-8228-432701868f34', // The Cornholy Trinity
  ];

  const divisionMap: Record<string, string> = {
    '77110b92-d2d8-495b-afed-cac65deb6253': 'Competitive',
    '0c7261b9-db22-48d1-8487-ba9eeb90fbef': 'Intermediate 1',
    '01ec006b-6ee3-47b3-ac8d-f93cc11d3460': 'Intermediate 2',
    '34b1dacf-0c30-4a4c-8228-432701868f34': 'Recreational',
  };

  return useQuery({
    queryKey: ['champions', winners],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', winners);

      if (error) {
        console.error('Error fetching champions:', error);
        throw error;
      }

      return { teams: data as TeamData[], divisionMap };
    },
  });
};

// Desktop display component
const ChampionDisplay: React.FC<{ 
  team: TeamData; 
  division: string; 
}> = ({ team, division }) => {
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <div className="ring-4 ring-amber-400 dark:ring-amber-500 rounded-lg p-1 bg-white dark:bg-slate-700 transition-transform duration-200 group-hover:scale-105">
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
            <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-slate-500" />
            </div>
          )}
        </div>
        <div className="absolute -top-1 -right-1 rounded-full p-1 bg-amber-500">
          <Crown className="w-3 h-3 text-white" />
        </div>
      </div>
      
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide font-medium mb-1 text-amber-600 dark:text-amber-400">
          Champion
        </p>
        <p className="font-semibold text-slate-900 dark:text-white text-sm">
          {team.name}
        </p>
      </div>
    </div>
  );
};

// Mobile carousel card component
const ChampionCardCompact: React.FC<{ 
  team: TeamData; 
  division: string; 
}> = ({ team, division }) => {
  return (
    <div className="flex flex-col items-center text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
      <p className="text-xs uppercase tracking-wide font-medium mb-2 text-slate-600 dark:text-slate-300">
        {division}
      </p>
      <div className="relative mb-2">
        <div className="ring-3 ring-amber-400 dark:ring-amber-500 rounded-lg p-0.5 bg-white dark:bg-slate-700">
          {team.image_url ? (
            <img
              src={team.image_url}
              alt={`${division} champion logo for ${team.name}`}
              width={64}
              height={64}
              loading="lazy"
              className="h-16 w-16 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-slate-500" />
            </div>
          )}
        </div>
        <div className="absolute -top-1 -right-1 rounded-full p-1 bg-amber-500">
          <Crown className="w-3 h-3 text-white" />
        </div>
      </div>
      <p className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
        {team.name}
      </p>
    </div>
  );
};

const ChampionsCard: React.FC = () => {
  const { data, isLoading, error } = useChampions();
  const divisions = ['Competitive', 'Intermediate 1', 'Intermediate 2', 'Recreational'];

  if (isLoading) {
    return (
      <section className={cn(
        "bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6",
        "animate-pulse"
      )}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-48"></div>
        {/* Mobile skeleton */}
        <div className="flex gap-2 md:hidden overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[130px] h-28 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
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
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
          <Trophy className="w-6 h-6" />
          Playoff Results - Error Loading
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Unable to load playoff results. Please try again later.
        </p>
      </section>
    );
  }

  return (
    <section className={cn(
      "bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6",
      "transition-opacity duration-500 ease-out",
      animations.fadeIn
    )}>
      <h2 className="text-xl md:text-2xl font-bold font-inter mb-4 flex items-center gap-2">
        🏆 Fall 2025 Champions
      </h2>
      
      {/* Mobile Carousel */}
      <div className="block md:hidden">
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent className="-ml-2">
            {divisions.map((divisionName) => {
              const team = data.teams.find((t) => data.divisionMap[t.id] === divisionName);
              if (!team) return null;
              return (
                <CarouselItem key={divisionName} className="pl-2 basis-[140px]">
                  <ChampionCardCompact team={team} division={divisionName} />
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Swipe to see all champions →
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid grid-cols-2 gap-4 md:gap-6">
        {divisions.map((divisionName) => {
          const team = data.teams.find((t) => data.divisionMap[t.id] === divisionName);
          if (!team) return null;
          return (
            <div key={divisionName} className="space-y-3">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                {divisionName}
              </h3>
              <div className="pl-2">
                <ChampionDisplay team={team} division={divisionName} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ChampionsCard;
