
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import BracketView from "@/components/playoffs/BracketView";
import ChampionDisplay from "@/components/playoffs/ChampionDisplay";
import { PlayoffBracket, Team } from "@/types";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface BracketDetailProps {
  bracketId: string;
  bracket: PlayoffBracket;
  teams: Team[];
  bracketLoading: boolean;
  onEditBracket: () => void;
  onEditMatch: (matchId: string) => void;
}

const BracketDetail: React.FC<BracketDetailProps> = ({
  bracketId,
  bracket,
  teams,
  bracketLoading,
  onEditBracket,
  onEditMatch,
}) => {
  const { isAdminAccessGranted } = useAdminAccess();

  return (
    <Card className="mb-8" id={`bracket-${bracketId}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{bracket.name}</CardTitle>
            <CardDescription>
              {bracket.division} Division • {bracket.format}
              {bracket.state && (
                <span className="ml-2">
                  • Status: <span className="font-medium">{bracket.state}</span>
                </span>
              )}
            </CardDescription>
          </div>
          {isAdminAccessGranted && (
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={onEditBracket}>
              <Edit className="h-4 w-4 mr-2" /> Edit Bracket
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {bracketLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
          </div>
        ) : (
          <>
            <BracketView 
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
    </Card>
  );
};

export default BracketDetail;
