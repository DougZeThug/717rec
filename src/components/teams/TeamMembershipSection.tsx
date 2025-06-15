
import React, { useState } from "react";
import { useTeamMembership } from "@/hooks/useTeamMembership";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Clock, CheckCircle, Edit } from "lucide-react";

const TeamMembershipSection: React.FC = () => {
  const { membership, availableTeams, isLoading, isFetching, joinTeam, leaveTeam } = useTeamMembership();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const handleJoinTeam = async () => {
    if (!selectedTeamId) return;
    await joinTeam(selectedTeamId);
    setSelectedTeamId("");
  };
  
  if (isFetching) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Team Membership</h3>
        <p className="text-sm text-muted-foreground">
          Join a team to participate in matches and track your stats. Admin approval is required.
        </p>
      </div>

      {membership ? (
        <Card className={membership.is_approved ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamLogo
                  imageUrl={membership.team?.imageUrl || membership.team?.logoUrl}
                  teamName={membership.team?.name || "Team"}
                  size="md"
                  rounded
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{membership.team?.name}</p>
                    {membership.is_approved ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending Approval
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {membership.is_approved && membership.approved_at
                      ? `Approved ${new Date(membership.approved_at).toLocaleDateString()}`
                      : `Requested ${new Date(membership.joined_at).toLocaleDateString()}`
                    }
                  </p>
                  {membership.is_approved && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      <Edit className="w-3 h-3 inline mr-1" />
                      You can edit team details
                    </p>
                  )}
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave {membership.team?.name}? You will lose your association with this team and any editing privileges.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={leaveTeam}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Leave Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team to join" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        imageUrl={team.logoUrl || team.imageUrl}
                        teamName={team.name}
                        size="sm"
                        rounded
                      />
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleJoinTeam}
            disabled={!selectedTeamId || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Request...
              </>
            ) : (
              "Request to Join Team"
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Your request will be reviewed by an admin before approval
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamMembershipSection;
