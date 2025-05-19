
import React, { useState } from "react";
import { Team } from "@/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import TeamLogo from "@/components/ui/team/TeamLogo";

interface TeamDivisionTableProps {
  divisions: string[];
  teams: Team[];
  isLoading: boolean;
}

const TeamDivisionTable: React.FC<TeamDivisionTableProps> = ({
  divisions,
  teams,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState(divisions[0] || "all");
  
  // Group teams by division
  const teamsByDivision = teams.reduce((acc, team) => {
    const division = team.division || team.divisionName || "Unassigned";
    if (!acc[division]) {
      acc[division] = [];
    }
    acc[division].push(team);
    return acc;
  }, {} as Record<string, Team[]>);
  
  // Add "All" option
  const tabOptions = ["all", ...divisions];
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No teams available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 md:flex md:flex-wrap">
          {tabOptions.map(division => (
            <TabsTrigger key={division} value={division} className="capitalize">
              {division === "all" ? "All Teams" : division}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {tabOptions.map(division => (
          <TabsContent key={division} value={division}>
            <Table className="border rounded-md">
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right">W-L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(division === "all" ? teams : teamsByDivision[division] || []).map(team => (
                  <TableRow key={team.id}>
                    <TableCell className="flex items-center gap-2">
                      <TeamLogo
                        src={team.logoUrl || team.imageUrl}
                        alt={team.name}
                        className="h-6 w-6"
                      />
                      <span className="font-medium">{team.name}</span>
                    </TableCell>
                    <TableCell>{team.division || team.divisionName || "Unassigned"}</TableCell>
                    <TableCell className="text-right">
                      {team.wins || 0}-{team.losses || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TeamDivisionTable;
