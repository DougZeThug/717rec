import { Download, Loader2, Search, Users2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSeasonOpponentHistory } from '@/hooks/useSeasonOpponentHistory';
import { cn } from '@/lib/utils';
import { exportMatchupsToExcel } from '@/utils/exportMatchupsToExcel';

const OpponentHistoryTab: React.FC = () => {
  const { data, isLoading, error } = useSeasonOpponentHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    if (!data?.teams) return [];
    const divSet = new Set<string>();
    data.teams.forEach((team) => {
      if (team.divisionName) divSet.add(team.divisionName);
    });
    return Array.from(divSet).sort();
  }, [data?.teams]);

  // Filter teams
  const filteredTeams = useMemo(() => {
    if (!data?.teams) return [];

    return data.teams.filter((team) => {
      const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDivision = divisionFilter === 'all' || team.divisionName === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [data?.teams, searchTerm, divisionFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Error loading opponent history. Please try again.
        </CardContent>
      </Card>
    );
  }

  if (!data || data.teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Matchups
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No completed matches found for the current season.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Matchups - {data.seasonName}
        </CardTitle>
        <CardDescription>
          Quick view of which teams have played each other this season (regular season only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((div) => (
                <SelectItem key={div} value={div}>
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => data && exportMatchupsToExcel(data)}
            disabled={!data}
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredTeams.length} teams with match history
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Team</TableHead>
                <TableHead className="w-[140px]">Division</TableHead>
                <TableHead>Opponents Played</TableHead>
                <TableHead className="w-[80px] text-center"># Opp</TableHead>
                <TableHead className="w-[80px] text-center"># Matches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.teamId}>
                  <TableCell className="font-medium">{team.teamName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {team.divisionName || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.opponents.length === 0 ? (
                        <span className="text-muted-foreground text-sm">No opponents yet</span>
                      ) : (
                        team.opponents.map((opp) => (
                          <Badge
                            key={opp.opponentId}
                            variant="secondary"
                            className={cn(
                              'text-xs cursor-default',
                              opp.wins > opp.losses &&
                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                              opp.wins < opp.losses &&
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            )}
                            title={`${opp.wins}-${opp.losses} vs ${opp.opponentName}`}
                          >
                            {opp.opponentName}
                            {opp.matchCount > 1 && (
                              <span className="ml-1 opacity-70">×{opp.matchCount}</span>
                            )}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {team.uniqueOpponentCount}
                  </TableCell>
                  <TableCell className="text-center font-mono">{team.totalMatches}</TableCell>
                </TableRow>
              ))}
              {filteredTeams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No teams match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpponentHistoryTab;
