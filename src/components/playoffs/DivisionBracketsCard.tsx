
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, RefreshCw } from "lucide-react";
import { PlayoffBracket } from "@/types";

interface DivisionBracketsCardProps {
  division: string;
  brackets: Array<Partial<PlayoffBracket>>;
  onViewBracket: (bracketId: string) => void;
  onCreateBracket?: () => void;
  onEditBracket?: () => void;
  onDeleteBracket?: (id: string, name: string) => void;
  onResyncBracket?: (bracketId: string, challongeTournamentId: number) => void;
  isResyncLoading?: boolean;
}

const DivisionBracketsCard: React.FC<DivisionBracketsCardProps> = ({
  division,
  brackets,
  onCreateBracket,
  onViewBracket,
  onEditBracket,
  onDeleteBracket,
  onResyncBracket,
  isResyncLoading = false,
}) => {
  return (
    <Card key={division}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-cornhole-wood" />
          {division} Division
        </CardTitle>
        <CardDescription>
          {brackets.length 
            ? `${brackets.length} active bracket${brackets.length > 1 ? 's' : ''}`
            : "No active brackets"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {brackets.length > 0 ? (
          brackets.map(bracket => (
            <div key={bracket.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex flex-col">
                <span className="font-medium">{bracket.name}</span>
                <span className="text-xs text-gray-500">{bracket.format}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => onViewBracket(bracket.id!)}
                >
                  View
                </Button>
                {onResyncBracket && bracket.challonge_tournament_id && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onResyncBracket(bracket.id!, bracket.challonge_tournament_id!)}
                    disabled={isResyncLoading}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {isResyncLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Resync
                  </Button>
                )}
                {onDeleteBracket && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700"
                    onClick={() => onDeleteBracket(bracket.id!, bracket.name!)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={onCreateBracket}>
            <Plus className="h-4 w-4 mr-1" /> Create Bracket
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DivisionBracketsCard;
