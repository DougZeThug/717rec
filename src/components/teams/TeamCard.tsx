
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Trophy, X, ExternalLink } from "lucide-react";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface TeamCardProps {
  team: Team;
  onDelete: (id: string) => void;
  onEdit: (team: Team) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onDelete, onEdit }) => {
  // Use the divisionName property if available, otherwise fall back to the original approach
  const divisionName = team.divisionName || "";
  
  // Division color mapping
  const getDivisionColor = () => {
    if (!divisionName) return "gray";
    
    const lowerDivName = divisionName.toLowerCase();
    if (lowerDivName.includes("competitive")) return "red-500";
    if (lowerDivName.includes("intermediate")) return "blue-500";
    if (lowerDivName.includes("recreational")) return "green-500";
    return "gray-400";
  };

  const divisionColor = getDivisionColor();

  return (
    <Card className="overflow-hidden h-full flex flex-col mb-4 sm:mb-0">
      <Link to={`/teams/${team.id}`} className="hover:opacity-80 transition-opacity">
        <div className="h-28 sm:h-36 bg-gray-100 flex items-center justify-center p-2">
          {!team.imageUrl ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No Team Image
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={team.imageUrl} 
                alt={team.name} 
                className="max-h-24 sm:max-h-32 max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </Link>
      <CardHeader className="pb-1 pt-2 space-y-1">
        <div className="flex justify-between items-start">
          <Link to={`/teams/${team.id}`} className="hover:underline">
            <CardTitle className="text-lg truncate pr-2" title={team.name}>{team.name}</CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreHorizontal size={15} />
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
              <DropdownMenuItem asChild>
                <Link to={`/teams/${team.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {divisionName && (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full bg-${divisionColor} flex-shrink-0`}></div>
            <Badge variant="outline" className="mr-auto text-xs">
              {divisionName}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow py-1">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium">{team.players.length}</span> 
            {team.players.length === 1 ? "Player" : "Players"}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-1">
            <div className="flex items-center gap-1 text-emerald-600">
              <Trophy size={12} /> {team.wins || 0} Wins
            </div>
            <div className="flex items-center gap-1 text-rose-600">
              <X size={12} /> {team.losses || 0} Losses
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-2">
        <div className="text-xs w-full">
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
