
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Trophy } from "lucide-react";
import BracketView from "@/components/playoffs/BracketView";
import { PlayoffBracket, Team } from "@/types";

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
  return (
    <Card className="mb-8" id={`bracket-${bracketId}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{bracket.name}</CardTitle>
            <CardDescription>
              {bracket.division} Division • {bracket.format}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="hidden md:flex" onClick={onEditBracket}>
            <Edit className="h-4 w-4 mr-2" /> Edit Bracket
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {bracketLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
          </div>
        ) : (
          <BracketView 
            bracket={bracket}
            teams={teams || []}
            onEditMatch={onEditMatch}
          />
        )}
        
        {bracket.champion && (
          <div className="mt-8 text-center">
            <div className="text-xl font-bold text-cornhole-navy mb-2">Champion</div>
            <div className="inline-flex items-center bg-cornhole-cream rounded-full px-6 py-3">
              <Trophy className="h-6 w-6 mr-2 text-cornhole-wood" />
              <span className="text-lg font-bold">
                {teams?.find(t => t.id === bracket.champion)?.name || "Unknown Team"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketDetail;
