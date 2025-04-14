
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Trophy, X } from "lucide-react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";

interface TeamCardProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit }) => {
  // Use the divisionName property if available, otherwise fall back to the original approach
  const divisionName = team.divisionName || "";

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div 
        className="h-28 sm:h-36 bg-gray-100 flex items-center justify-center" 
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
      <CardHeader className="pb-2 space-y-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg sm:text-xl truncate pr-2">{team.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
          <Badge variant="outline" className="mr-auto">
            {divisionName}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
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
      <CardFooter className="pt-1 pb-3">
        <div className="text-sm w-full">
          <span className="font-semibold">Players:</span> 
          <span className="text-muted-foreground ml-1 block truncate">
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
