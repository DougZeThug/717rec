
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Trophy, X } from "lucide-react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useDivisions } from "@/hooks/useDivisions";

interface TeamCardProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit }) => {
  const { divisions } = useDivisions();
  
  const getDivisionName = (divisionId: string | undefined): string => {
    if (!divisionId) return "";
    const division = divisions.find(d => d.id === divisionId);
    return division ? division.name : "";
  };

  const divisionName = getDivisionName(team.division);

  return (
    <Card className="overflow-hidden">
      <div 
        className="h-36 bg-gray-100 flex items-center justify-center" 
        style={{ 
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundImage: team.imageUrl ? `url(${team.imageUrl})` : 'none',
        }}
      >
        {!team.imageUrl && (
          <div className="flex items-center justify-center h-full text-gray-400">
            No Team Image
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="truncate">{team.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal size={16} />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive" 
                onClick={() => onDelete(team.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {divisionName && (
          <Badge variant="outline" className="mt-1">
            {divisionName}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{team.players.length}</span> 
            {team.players.length === 1 ? "Player" : "Players"}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="flex items-center gap-1 text-emerald-600">
              <Trophy size={14} /> {team.wins || 0} Wins
            </div>
            <div className="flex items-center gap-1 text-rose-600">
              <X size={14} /> {team.losses || 0} Losses
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1 pb-4">
        <div className="text-sm">
          <span className="font-semibold">Players:</span> 
          <span className="text-muted-foreground ml-1">
            {team.players.length > 0
              ? team.players.map(p => p.name).slice(0, 3).join(', ') 
                + (team.players.length > 3 ? ` +${team.players.length - 3} more` : '')
              : "No players"
            }
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TeamCard;
