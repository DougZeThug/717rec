
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus } from "lucide-react";
import { PlayoffBracket } from "@/types";

interface DivisionBracketsCardProps {
  division: string;
  brackets: Array<Partial<PlayoffBracket>>;
  onCreateBracket: () => void;
  onViewBracket: (bracketId: string) => void;
}

const DivisionBracketsCard: React.FC<DivisionBracketsCardProps> = ({
  division,
  brackets,
  onCreateBracket,
  onViewBracket,
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
            <div key={bracket.id} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span>{bracket.name}</span>
                <span className="text-xs text-gray-500">{bracket.format}</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onViewBracket(bracket.id!)}
              >
                View
              </Button>
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
