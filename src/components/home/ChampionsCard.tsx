
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

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
    'ad4ec289-fd85-4322-8ebb-68647607de23', // Cuzzo's Clinic
    'c9d644a4-4e5a-43a0-9805-9d93299cda35', // Pepperoni Cheesers
    '2ab2e684-8c28-45c3-801a-ea215433a8e4', // Miracle @ Marion
    'c577e0f9-6700-4220-a902-b368ca915bbd', // Here for Fireball
  ];

  const divisionMap: Record<string, string> = {
    'ad4ec289-fd85-4322-8ebb-68647607de23': 'Competitive',
    'c9d644a4-4e5a-43a0-9805-9d93299cda35': 'Intermediate 1',
    '2ab2e684-8c28-45c3-801a-ea215433a8e4': 'Intermediate 2',
    'c577e0f9-6700-4220-a902-b368ca915bbd': 'Recreational',
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
                console.error(`Image load error for ${team.name}:`, team.image_url);
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

const ChampionsCard: React.FC = () => {
  const { data, isLoading, error } = useChampions();

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
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
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
        🏆 Summer 1 2025 Champions
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {['Competitive', 'Intermediate 1', 'Intermediate 2', 'Recreational'].map((divisionName) => {
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
