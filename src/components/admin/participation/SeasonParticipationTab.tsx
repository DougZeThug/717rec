import React, { useState, useMemo } from "react";
import { Users, Check, X, HelpCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSeasons } from "@/hooks/useSeasons";
import { useSeasonParticipations } from "@/hooks/useSeasonParticipation";
import { useTeams } from "@/hooks/useTeams";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type StatusFilter = 'all' | 'PLAYING' | 'NOT_PLAYING' | 'NO_RESPONSE';

const SeasonParticipationTab: React.FC = () => {
  const { data: seasons, isLoading: seasonsLoading } = useSeasons();
  const { teams, isLoading: teamsLoading } = useTeams();
  
  // Default to most recent active season
  const defaultSeasonId = useMemo(() => {
    if (!seasons?.length) return "";
    const activeSeason = seasons.find((s) => s.is_active);
    return activeSeason?.id ?? seasons[0]?.id ?? "";
  }, [seasons]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(defaultSeasonId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Update selected season when seasons load
  React.useEffect(() => {
    if (defaultSeasonId && !selectedSeasonId) {
      setSelectedSeasonId(defaultSeasonId);
    }
  }, [defaultSeasonId, selectedSeasonId]);

  const { data: participations, isLoading: participationsLoading } = useSeasonParticipations(
    selectedSeasonId || undefined
  );

  // Combine teams with their participation status
  const teamsWithStatus = useMemo(() => {
    if (!teams) return [];

    const participationMap = new Map(
      participations?.map((p) => [p.team_id, p]) ?? []
    );

    return teams.map((team) => {
      const participation = participationMap.get(team.id);
      return {
        ...team,
        participation,
        status: participation?.status ?? 'NO_RESPONSE' as const,
        updatedAt: participation?.updated_at,
        submittedBy: participation?.submitted_by_name,
      };
    });
  }, [teams, participations]);

  // Filter based on status
  const filteredTeams = useMemo(() => {
    if (statusFilter === 'all') return teamsWithStatus;
    return teamsWithStatus.filter((t) => t.status === statusFilter);
  }, [teamsWithStatus, statusFilter]);

  // PERFORMANCE: Count statuses in single pass instead of 3 separate filters
  const counts = useMemo(() => {
    return teamsWithStatus.reduce(
      (acc, team) => {
        if (team.status === 'PLAYING') acc.playing++;
        else if (team.status === 'NOT_PLAYING') acc.notPlaying++;
        else acc.noResponse++;
        return acc;
      },
      { playing: 0, notPlaying: 0, noResponse: 0, total: teamsWithStatus.length }
    );
  }, [teamsWithStatus]);

  const handleExportCsv = () => {
    const headers = ['Team Name', 'Division', 'Status', 'Updated At', 'Submitted By'];
    const rows = filteredTeams.map((t) => [
      t.name,
      t.divisionName ?? '',
      t.status,
      t.updatedAt ? format(new Date(t.updatedAt), 'yyyy-MM-dd HH:mm') : '',
      t.submittedBy ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participation-${selectedSeasonId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = seasonsLoading || teamsLoading || participationsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Season Participation</h2>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Season selector */}
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons?.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name} {season.is_active && "(Active)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PLAYING">Playing</SelectItem>
              <SelectItem value="NOT_PLAYING">Not Playing</SelectItem>
              <SelectItem value="NO_RESPONSE">No Response</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Playing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{counts.playing}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Playing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{counts.notPlaying}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{counts.noResponse}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{counts.total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Submitted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No teams found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-muted-foreground">{team.divisionName ?? '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            team.status === 'PLAYING' && "bg-green-500/10 text-green-600 border-green-500/30",
                            team.status === 'NOT_PLAYING' && "bg-red-500/10 text-red-600 border-red-500/30",
                            team.status === 'NO_RESPONSE' && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                          )}
                        >
                          {team.status === 'PLAYING' && <Check className="h-3 w-3 mr-1" />}
                          {team.status === 'NOT_PLAYING' && <X className="h-3 w-3 mr-1" />}
                          {team.status === 'NO_RESPONSE' && <HelpCircle className="h-3 w-3 mr-1" />}
                          {team.status === 'PLAYING' ? 'Playing' : team.status === 'NOT_PLAYING' ? 'Not Playing' : 'No Response'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {team.updatedAt ? format(new Date(team.updatedAt), 'MMM d, h:mm a') : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{team.submittedBy ?? '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeasonParticipationTab;
