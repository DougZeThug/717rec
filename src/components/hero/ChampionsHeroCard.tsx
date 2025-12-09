import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Calendar } from "lucide-react";
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
    <div className="flex items-center gap-3 group p-2 rounded-lg hover:bg-white/10 transition-colors duration-200">
      <div className="relative">
        <div className="ring-4 ring-white/40 rounded-lg p-1 bg-white/20 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
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
            <div className="h-20 w-20 rounded-lg bg-white/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-white/70" />
            </div>
          )}
        </div>
        <div className="absolute -top-1 -right-1 rounded-full p-1 bg-white/30 backdrop-blur-sm">
          <Crown className="w-3 h-3 text-white" />
        </div>
      </div>
      
      <div className="flex-1">
        <p className="text-xs font-bebas uppercase tracking-wide mb-1 text-white/80">
          Champion
        </p>
        <p className="font-inter font-semibold text-white text-sm">
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
        "bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 rounded-2xl shadow-2xl p-4 md:p-6",
        "animate-pulse"
      )}>
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
      <section className="bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 rounded-2xl shadow-2xl p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 text-white">
          <Trophy className="w-6 h-6" />
          Champions - Error Loading
        </h2>
        <p className="text-white/80">
          Unable to load champions. Please try again later.
        </p>
      </section>
    );
  }

  const divisionOrder = Object.keys(championsMap);

  return (
    <section className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500",
      "rounded-2xl shadow-2xl p-4 md:p-6",
      "transition-opacity duration-500 ease-out",
      animations.fadeIn
    )}>
      {/* Header with badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className={cn(
          "text-xl md:text-2xl font-bebas uppercase tracking-wide flex items-center gap-2",
          "text-white"
        )}>
          <Trophy className="w-6 h-6 text-white" />
          {card.title}
        </h2>
        
        {/* Season Badge with Glassmorphism */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          <Calendar className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-sm">Fall 2025 Season</span>
        </div>
      </div>
      
      {/* Glassmorphism Division Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {divisionOrder.map((divisionName) => {
          const teamId = championsMap[divisionName];
          const team = data.teams.find((t) => t.id === teamId);
          
          if (!team) return null;
          
          return (
            <div key={divisionName} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <h3 className="text-xs text-white/80 uppercase tracking-wide text-center mb-2 font-bebas">
                {divisionName}
              </h3>
              <ChampionDisplay team={team} division={divisionName} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ChampionsHeroCard;
