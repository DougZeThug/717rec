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
    <div className="flex items-center gap-3 group p-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors duration-200">
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
        <p className="text-xs font-bebas uppercase tracking-wide mb-1 text-amber-600 dark:text-amber-400">
          Champion
        </p>
        <p className="font-inter font-semibold text-slate-900 dark:text-white text-sm">
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
      "border-t-4 border-t-amber-500 dark:border-t-amber-400",
      "border border-border/30",
      "bg-gradient-to-br from-white via-white to-amber-50/30",
      "dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900",
      "transition-opacity duration-500 ease-out",
      animations.fadeIn
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/10 via-transparent to-amber-50/5 dark:from-amber-900/5 dark:to-transparent rounded-2xl pointer-events-none" />
      
      <h2 className={cn(
        "text-xl md:text-2xl font-bebas uppercase tracking-wide mb-4 flex items-center gap-2",
        "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500",
        "dark:from-amber-400 dark:to-yellow-400",
        "bg-clip-text text-transparent"
      )}>
        <Trophy className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        {card.title}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {divisionOrder.map((divisionName) => {
          const teamId = championsMap[divisionName];
          const team = data.teams.find((t) => t.id === teamId);
          
          if (!team) return null;
          
          return (
            <div key={divisionName} className="space-y-2">
              <h3 className="text-sm font-bebas uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {divisionName}
              </h3>
              <div className="pl-1">
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
