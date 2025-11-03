
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, RefreshCw, Zap } from "lucide-react";
import { PlayoffBracket } from "@/types";

interface DivisionBracketsCardProps {
  division: string;
  brackets: Array<Partial<PlayoffBracket>>;
  onViewBracket?: (bracketId: string) => void;
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
  
  const handleViewBracket = (bracketId: string) => {
    console.log('🎯 DivisionBracketsCard: View bracket clicked for ID:', bracketId);
    onViewBracket(bracketId);
  };

  return (
    <Card key={division}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-cornhole-wood" />
          {division} Division
        </CardTitle>
        <CardDescription>
          {brackets.length 
            ? `${brackets.length} bracket${brackets.length > 1 ? 's' : ''}`
            : "No brackets"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {brackets.length > 0 ? (
          brackets.map(bracket => (
            <div key={bracket.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{bracket.name}</span>
                  {bracket.uses_brackets_manager ? (
                    <Badge variant="default" className="text-xs flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Smart Progression
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Legacy
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{bracket.format}</span>
              </div>
              <div className="flex gap-2">
                {onViewBracket && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleViewBracket(bracket.id!)}
                  >
                    View
                  </Button>
                )}
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
          onCreateBracket && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                console.log('🎯 DivisionBracketsCard: Create bracket button clicked for division:', division);
                onCreateBracket();
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Bracket
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default DivisionBracketsCard;
