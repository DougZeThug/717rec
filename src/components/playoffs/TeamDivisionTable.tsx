
import React, { useState, useEffect } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Set initial active tab to the first available division or "all"
  useEffect(() => {
    if (divisions.length > 0) {
      setActiveTab("all");
    }
  }, [divisions]);
  
  // Improved team grouping by division name
  const teamsByDivision = React.useMemo(() => {
    const grouped: Record<string, Team[]> = {
      "Unassigned": []
    };
    
    // Initialize all divisions
    divisions.forEach(division => {
      grouped[division] = [];
    });
    
    // Group teams by division name
    teams.forEach(team => {
      const divisionName = team.divisionName || "Unassigned";
      
      if (!grouped[divisionName]) {
        grouped[divisionName] = [];
      }
      
      grouped[divisionName].push(team);
    });
    
    // Sort teams alphabetically within each division
    Object.keys(grouped).forEach(division => {
      grouped[division].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    console.log("Teams by division in TeamDivisionTable:", grouped);
    return grouped;
  }, [teams, divisions]);
  
  // Add "All" option and filter out empty divisions for tab display
  const tabOptions = React.useMemo(() => {
    const options = ["all"];
    
    // Only include divisions that actually have teams
    divisions.forEach(division => {
      if (teamsByDivision[division]?.length > 0) {
        options.push(division);
      }
    });
    
    // Add "Unassigned" if there are unassigned teams
    if (teamsByDivision["Unassigned"]?.length > 0) {
      options.push("Unassigned");
    }
    
    return options;
  }, [divisions, teamsByDivision]);
  
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
      <Alert variant="warning" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Teams Available</AlertTitle>
        <AlertDescription>
          No teams have been added to the system. Add some teams first.
        </AlertDescription>
      </Alert>
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
              {division !== "all" && (
                <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {division === "Unassigned" 
                    ? teamsByDivision["Unassigned"]?.length || 0
                    : teamsByDivision[division]?.length || 0}
                </span>
              )}
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
                        imageUrl={team.logoUrl || team.imageUrl}
                        teamName={team.name}
                        className="h-6 w-6"
                      />
                      <span className="font-medium">{team.name}</span>
                    </TableCell>
                    <TableCell>{team.divisionName || "Unassigned"}</TableCell>
                    <TableCell className="text-right">
                      {team.wins || 0}-{team.losses || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Show message when no teams are in a division */}
            {division !== "all" && teamsByDivision[division]?.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                No teams in this division
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TeamDivisionTable;
