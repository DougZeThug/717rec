
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

const usePlayoffResults = () => {
  const divisions: DivisionData[] = [
    { 
      id: 'competitive', 
      label: 'Competitive',
      winner_id: 'ad4ec289-fd85-4322-8ebb-68647607de23', // Cuzzo's Clinic
      runner_up_id: '9ee2b996-99f6-446c-be20-8255ca75d8c8' // 3 Amigos
    },
    { 
      id: 'intermediate1', 
      label: 'Intermediate 1',
      winner_id: 'af3bf12d-b671-4458-9d3c-5c2e29e362ac', // Came from Dicks
      runner_up_id: '4ce38a7a-df7b-4d71-a17c-b8be65e342fe' // Sweat Bandits
    },
    { 
      id: 'intermediate2', 
      label: 'Intermediate 2',
      winner_id: '21f5f389-1ad4-4dc5-a828-0e2972c13845', // Bag Assassins
      runner_up_id: '56387477-8ba1-43b7-a307-414926ca5f79' // Zoo Pals
    },
    { 
      id: 'recreational', 
      label: 'Recreational',
      winner_id: '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', // Double Trouble
      runner_up_id: 'c577e0f9-6700-4220-a902-b368ca915bbd' // Here for Fireball
    },
  ];

  const allTeamIds = divisions.flatMap(div => [div.winner_id, div.runner_up_id]);

  return useQuery({
    queryKey: ['playoff-results', allTeamIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .in('id', allTeamIds);

      if (error) {
        console.error('Error fetching playoff results:', error);
        throw error;
      }

      return { teams: data as TeamData[], divisions };
    },
  });
};

const TeamDisplay: React.FC<{ 
  team: TeamData; 
  isWinner: boolean; 
  division: string; 
}> = ({ team, isWinner, division }) => {
  return (
    <div className="flex items-center gap-3 group">
      <div className="relative">
        <div className={cn(
          "ring-4 rounded-lg p-1 bg-white dark:bg-slate-700 transition-transform duration-200 group-hover:scale-105",
          isWinner 
            ? "ring-amber-400 dark:ring-amber-500" 
            : "ring-slate-400 dark:ring-slate-300"
        )}>
          {team.image_url ? (
            <img
              src={team.image_url}
              alt={`${division} ${isWinner ? 'champion' : 'runner-up'} logo for ${team.name}`}
              className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => {
                console.error(`Image load error for ${team.name}:`, team.image_url);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-slate-500" />
            </div>
          )}
        </div>
        <div className={cn(
          "absolute -top-1 -right-1 rounded-full p-1",
          isWinner ? "bg-amber-500" : "bg-slate-400"
        )}>
          {isWinner ? (
            <Crown className="w-3 h-3 text-white" />
          ) : (
            <Medal className="w-3 h-3 text-white" />
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <p className={cn(
          "text-xs uppercase tracking-wide font-medium mb-1",
          isWinner 
            ? "text-amber-600 dark:text-amber-400" 
            : "text-slate-500 dark:text-slate-400"
        )}>
          {isWinner ? 'Champion' : 'Runner-up'}
        </p>
        <p className="font-semibold text-slate-900 dark:text-white text-sm">
          {team.name}
        </p>
      </div>
    </div>
  );
};

const ChampionsCard: React.FC = () => {
  const { data, isLoading, error } = usePlayoffResults();

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
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
        <Crown className="w-6 h-6 text-amber-500" />
        Spring 2025 Playoff Results
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {data.divisions.map((division) => {
          const winner = data.teams.find((t) => t.id === division.winner_id);
          const runnerUp = data.teams.find((t) => t.id === division.runner_up_id);
          
          if (!winner || !runnerUp) return null;
          
          return (
            <div key={division.id} className="space-y-3">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                {division.label}
              </h3>
              <div className="space-y-2 pl-2">
                <TeamDisplay team={winner} isWinner={true} division={division.label} />
                <TeamDisplay team={runnerUp} isWinner={false} division={division.label} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ChampionsCard;
