import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroCard } from "@/types/heroCard";
import { animations } from "@/styles/design-system";

interface ChampionsHeroCardProps {
  card: HeroCard;
}

interface TeamData {
  id: string;
  name: string;
  image_url: string | null;
}

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

const ChampionsHeroCard: React.FC<ChampionsHeroCardProps> = ({ card }) => {
  const championsMap = card.metadata?.champions as Record<string, string> || {};
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

      // Create reverse mapping from team ID to division
      const divisionMap: Record<string, string> = {};
      Object.entries(championsMap).forEach(([division, teamId]) => {
        divisionMap[teamId] = division;
      });

      return { teams: data as TeamData[], divisionMap };
    },
    enabled: championIds.length > 0
  });

  if (isLoading) {
    return (
      <section className={cn(
        "bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6",
        "animate-pulse"
      )}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="space-y-1">
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
          Champions - Error Loading
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Unable to load champions. Please try again later.
        </p>
      </section>
    );
  }

  const divisionOrder = Object.keys(championsMap);

  return (
    <section className={cn(
      card.background_color || "bg-white dark:bg-slate-800",
      "rounded-2xl shadow-xl p-4 md:p-6",
      "transition-opacity duration-500 ease-out",
      animations.fadeIn
    )}>
      <h2 className={cn(
        "text-xl md:text-2xl font-bold font-inter mb-4 flex items-center gap-2",
        card.text_color
      )}>
        {card.title}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {divisionOrder.map((divisionName) => {
          const teamId = championsMap[divisionName];
          const team = data.teams.find((t) => t.id === teamId);
          
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

export default ChampionsHeroCard;
