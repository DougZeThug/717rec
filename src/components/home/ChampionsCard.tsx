
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface ChampionTeam {
  id: string;
  name: string;
  image_url: string | null;
}

const useChampions = () => {
  const winnerIds = [
    'ad4ec289-fd85-4322-8ebb-68647607de23', // Cuzzo's Clinic - Competitive
    'af3bf12d-b671-4458-9d3c-5c2e29e362ac', // Came from Dicks - Intermediate 1
    '21f5f389-1ad4-4dc5-a828-0e2972c13845', // Bag Assassins - Intermediate 2
    '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', // Double Trouble - Recreational
  ];

  return useQuery({
    queryKey: ['champions', winnerIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', winnerIds);

      if (error) {
        console.error('Error fetching champion teams:', error);
        throw error;
      }

      return data as ChampionTeam[];
    },
  });
};

const ChampionsCard: React.FC = () => {
  const { data: winners, isLoading, error } = useChampions();

  const divisions = [
    { id: 'ad4ec289-fd85-4322-8ebb-68647607de23', label: 'Competitive' },
    { id: 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', label: 'Intermediate 1' },
    { id: '21f5f389-1ad4-4dc5-a828-0e2972c13845', label: 'Intermediate 2' },
    { id: '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', label: 'Recreational' },
  ];

  if (isLoading) {
    return (
      <section className={cn(
        "bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6",
        "animate-pulse"
      )}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-48"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 md:gap-4">
              <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error || !winners) {
    return (
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
          <Trophy className="w-6 h-6" />
          Champions - Error Loading
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Unable to load champion information. Please try again later.
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
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
        <Crown className="w-6 h-6 text-amber-500" />
        Spring 2025 Champions
      </h2>
      
      <ul className="flex flex-col gap-4">
        {divisions.map((division) => {
          const team = winners.find((w) => w.id === division.id);
          if (!team) return null;
          
          return (
            <li key={division.id} className="flex items-center gap-3 md:gap-4 group">
              <div className="relative">
                <div className="ring-4 ring-amber-400 dark:ring-amber-500 rounded-lg p-1 bg-white dark:bg-slate-700 transition-transform duration-200 group-hover:scale-105">
                  {team.image_url ? (
                    <img
                      src={team.image_url}
                      alt={`${division.label} champion logo for ${team.name}`}
                      className="h-16 w-16 rounded-lg object-cover"
                      onError={(e) => {
                        console.error(`Image load error for ${team.name}:`, team.image_url);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-amber-500" />
                    </div>
                  )}
                </div>
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {division.label}
                </p>
                <p className="font-semibold text-slate-900 dark:text-white text-sm md:text-base">
                  {team.name}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ChampionsCard;
