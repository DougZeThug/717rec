
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Trash, ListOrdered } from "lucide-react";
import BracketView from "@/components/playoffs/BracketView";
import ChampionDisplay from "@/components/playoffs/ChampionDisplay";
import { PlayoffBracket, Team } from "@/utils/playoffs/playoffTypes";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";
import { SeedingUpdateDialog } from "./SeedingUpdateDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BracketDetailProps {
  bracketId: string;
  bracket: PlayoffBracket | null;
  teams: Team[];
  bracketLoading: boolean;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
  onDeleteBracket?: (bracketId: string, bracketName: string) => void;
}

const BracketDetail: React.FC<BracketDetailProps> = ({
  bracketId,
  bracket,
  teams,
  bracketLoading,
  onEditBracket,
  onEditMatch,
  onDeleteBracket,
}) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [seedingDialogOpen, setSeedingDialogOpen] = useState(false);

  // Fetch current participants for seeding updates
  const { data: participants } = useQuery({
    queryKey: ['bracket-participants', bracketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participant')
        .select('*')
        .eq('tournament_id', bracketId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!bracketId
  });

  // Get the division color class based on division name
  const getDivisionColorClass = (division: string) => {
    const divisonLower = division.toLowerCase();
    if (divisonLower.includes("recreational")) return "border-green-400 dark:border-green-600";
    if (divisonLower.includes("intermediate")) return "border-blue-400 dark:border-blue-600";
    if (divisonLower.includes("competitive")) return "border-amber-400 dark:border-amber-600";
    return "border-gray-400 dark:border-gray-600";
  };

  // Early return if bracket is not loaded
  if (!bracket) {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "mb-8 overflow-hidden",
        "border-t-4",
        getDivisionColorClass(bracket.division || ""),
        isLight ? blueAmber.background.card : ""
      )}
      id={`bracket-${bracketId}`}
    >
      <CardHeader className="bg-gradient-to-r from-transparent via-blue-50/30 to-amber-50/20 dark:from-transparent dark:via-gray-800/30 dark:to-gray-900/80">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className={cn(
              blueAmber.text.heading,
              "text-2xl font-bold tracking-tight",
              "heading-winter"
            )}>
              {bracket.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="font-medium">{bracket.division} Division</span>
              <span className="text-gray-400">•</span>
              <span>{bracket.format}</span>
              {bracket.state && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    bracket.state === 'pending' ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                    bracket.state === 'in_progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}>
                    {bracket.state.charAt(0).toUpperCase() + bracket.state.slice(1)}
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          {isAdminAccessGranted && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex"
                onClick={() => setSeedingDialogOpen(true)}
                disabled={bracket.state === 'completed'}
              >
                <ListOrdered className="h-4 w-4 mr-2" /> Update Seeding
              </Button>

              <Button variant="outline" size="sm" className="hidden md:flex" onClick={onEditBracket}>
                <Edit className="h-4 w-4 mr-2" /> Edit Bracket
              </Button>
              
              {onDeleteBracket && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="hidden md:flex" 
                  onClick={() => onDeleteBracket(bracketId, bracket.name || "")}
                >
                  <Trash className="h-4 w-4 mr-2" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {bracketLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
          </div>
        ) : (
          <>
            <BracketView 
              bracketId={bracketId}
              bracket={bracket}
              teams={teams || []}
              onEditMatch={isAdminAccessGranted ? onEditMatch : undefined}
            />
            
            <ChampionDisplay 
              championId={bracket.champion} 
              teams={teams} 
            />
          </>
        )}
      </CardContent>

      <SeedingUpdateDialog
        open={seedingDialogOpen}
        onOpenChange={setSeedingDialogOpen}
        bracketId={bracketId}
        bracketName={bracket.name}
        currentParticipants={participants || []}
        bracketState={bracket.state || 'pending'}
      />
    </Card>
  );
};

export default BracketDetail;
