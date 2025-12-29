
import React from "react";
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogDescription, 
  ResponsiveDialogHeader, 
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Team } from "@/types";

interface TeamDivisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamsByDivision: Record<string, Team[]>;
  availableDivisions: string[];
  teamsLoading: boolean;
  onTeamDivisionChange: (teamId: string, divisionName: string) => void;
}

const TeamDivisionDialog: React.FC<TeamDivisionDialogProps> = ({
  open,
  onOpenChange,
  teamsByDivision,
  availableDivisions,
  teamsLoading,
  onTeamDivisionChange
}) => {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Manage Team Divisions</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Assign teams to different divisions for playoff organization.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {teamsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-cornhole-navy" />
            </div>
          ) : (
            <div className="space-y-6">
              {availableDivisions.map(division => (
                <div key={division} className="space-y-3">
                  <h3 className="text-lg font-semibold">{division} Division</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamsByDivision[division]?.map(team => (
                      <Card key={team.id} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted mr-2">
                                {team.logoUrl ? (
                                  <img 
                                    src={team.logoUrl} 
                                    alt={team.name} 
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">No Logo</div>
                                )}
                              </div>
                              <span className="truncate max-w-[120px]" title={team.name}>{team.name}</span>
                            </div>
                            <Select
                              value={team.divisionName || "Unassigned"}
                              onValueChange={(value) => onTeamDivisionChange(team.id!, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Division..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableDivisions.map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {teamsByDivision["Unassigned"]?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Unassigned Teams</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamsByDivision["Unassigned"]?.map(team => (
                      <Card key={team.id} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted mr-2">
                                {team.logoUrl ? (
                                  <img 
                                    src={team.logoUrl} 
                                    alt={team.name} 
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">No Logo</div>
                                )}
                              </div>
                              <span className="truncate max-w-[120px]" title={team.name}>{team.name}</span>
                            </div>
                            <Select
                              value={team.divisionName || "Unassigned"}
                              onValueChange={(value) => onTeamDivisionChange(team.id!, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Division..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableDivisions.map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                                <SelectItem value="Unassigned">Unassigned</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <ResponsiveDialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default TeamDivisionDialog;
