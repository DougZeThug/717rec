import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search, Image, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Team } from "@/types";
import { useTeamsQuery } from "@/hooks/teams";
import { getLogoStatus, LogoStatus } from "@/utils/logoStatusUtils";
import TeamLogoCard from "./TeamLogoCard";

type FilterStatus = 'all' | LogoStatus;
type SortOption = 'name' | 'status';

const BulkLogoUpdateTab: React.FC = () => {
  const { data: teams, isLoading, refetch } = useTeamsQuery({ includeHidden: true });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('status');

  // Calculate stats
  const stats = useMemo(() => {
    if (!teams) return { total: 0, optimized: 0, legacy: 0, missing: 0 };
    
    return teams.reduce(
      (acc, team) => {
        const status = getLogoStatus(team.imageUrl);
        acc.total++;
        acc[status]++;
        return acc;
      },
      { total: 0, optimized: 0, legacy: 0, missing: 0 }
    );
  }, [teams]);

  const optimizationPercentage = stats.total > 0 
    ? Math.round((stats.optimized / stats.total) * 100) 
    : 0;

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    if (!teams) return [];

    let result = teams.filter(team => {
      const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
      const status = getLogoStatus(team.imageUrl);
      const matchesFilter = filterStatus === 'all' || status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    // Sort teams
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Sort by status priority: missing > legacy > optimized
      const statusPriority: Record<LogoStatus, number> = {
        missing: 0,
        legacy: 1,
        optimized: 2,
      };
      const statusA = getLogoStatus(a.imageUrl);
      const statusB = getLogoStatus(b.imageUrl);
      return statusPriority[statusA] - statusPriority[statusB];
    });

    return result;
  }, [teams, searchTerm, filterStatus, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <Image className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.optimized}</p>
              <p className="text-sm text-muted-foreground">Optimized</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.legacy}</p>
              <p className="text-sm text-muted-foreground">Needs Update</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.missing}</p>
              <p className="text-sm text-muted-foreground">Missing Logo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Logo Optimization Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.optimized}/{stats.total} ({optimizationPercentage}%)
            </span>
          </div>
          <Progress value={optimizationPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bulk Logo Update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Logos</SelectItem>
                <SelectItem value="optimized">🟢 Optimized</SelectItem>
                <SelectItem value="legacy">🟡 Needs Update</SelectItem>
                <SelectItem value="missing">🔴 Missing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">By Priority</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredTeams.map((team) => (
              <TeamLogoCard
                key={team.id}
                team={team}
                onUpdate={refetch}
              />
            ))}
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No teams found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkLogoUpdateTab;
