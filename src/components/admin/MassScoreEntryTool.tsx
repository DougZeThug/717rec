
import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  ArrowDownAZ,
  Calendar,
  TableProperties,
  Save,
  Filter,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Match, Team } from "@/types";

interface MassScoreEntryToolProps {}

// Extended Match interface for our component's internal use
interface MatchWithTeams extends Match {
  team1?: Team;
  team2?: Team;
  isEdited?: boolean;
  isValid?: boolean;
}

const MassScoreEntryTool: React.FC<MassScoreEntryToolProps> = () => {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [bracketFilter, setBracketFilter] = useState<string | undefined>(undefined);
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchBrackets();
    fetchMatches();
  }, [filterDate, bracketFilter]);

  const fetchBrackets = async () => {
    try {
      const { data, error } = await supabase
        .from('brackets')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setBrackets(data || []);
    } catch (error: any) {
      console.error("Error fetching brackets:", error.message);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    let query = supabase
      .from('matches')
      .select(`
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `)
      .order('date', { ascending: true });

    // Apply date filter if selected
    if (filterDate) {
      const dateStr = format(filterDate, 'yyyy-MM-dd');
      query = query.gte('date', `${dateStr}T00:00:00`)
                   .lt('date', `${dateStr}T23:59:59`);
    }

    // Apply bracket filter if selected
    if (bracketFilter) {
      query = query.eq('bracket_id', bracketFilter);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      const formattedMatches: MatchWithTeams[] = (data || []).map(match => {
        // Convert from database snake_case to our TypeScript camelCase
        return {
          id: match.id,
          team1Id: match.team1_id,
          team2Id: match.team2_id,
          team1Score: match.team1_score,
          team2Score: match.team2_score,
          date: match.date,
          location: match.location,
          iscompleted: match.iscompleted,
          winnerId: match.winner_id,
          loserId: match.loser_id,
          round_number: match.round_number,
          position: match.position,
          bracket_id: match.bracket_id,
          match_type: match.match_type,
          next_match_id: match.next_match_id,
          next_loser_match_id: match.next_loser_match_id,
          best_of: match.best_of,
          created_at: match.created_at,
          // Map the team relation data
          team1: match.team1 ? {
            id: match.team1.id,
            name: match.team1.name,
            logoUrl: match.team1.logo_url,
            players: [],
            wins: 0,
            losses: 0,
            created_at: ""
          } : undefined,
          team2: match.team2 ? {
            id: match.team2.id,
            name: match.team2.name,
            logoUrl: match.team2.logo_url,
            players: [],
            wins: 0,
            losses: 0,
            created_at: ""
          } : undefined,
          isEdited: false,
          isValid: validateMatchScores(match.team1_score, match.team2_score)
        };
      });

      setMatches(formattedMatches);
    } catch (error: any) {
      console.error("Error fetching matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to fetch matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return Number.isInteger(score1) && Number.isInteger(score2);
  };

  const handleScoreChange = (index: number, team: 'team1' | 'team2', value: string) => {
    const newMatches = [...matches];
    const scoreValue = value === "" ? null : parseInt(value, 10);
    const match = newMatches[index];
    
    if (team === 'team1') {
      match.team1Score = scoreValue;
    } else {
      match.team2Score = scoreValue;
    }

    match.isEdited = true;
    match.isValid = validateMatchScores(match.team1Score, match.team2Score);
    setMatches(newMatches);
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    const newMatches = [...matches];
    newMatches[index].iscompleted = checked;
    newMatches[index].isEdited = true;
    setMatches(newMatches);
  };

  const handleSubmitAll = async () => {
    // Get only edited matches
    const editedMatches = matches.filter(match => match.isEdited);
    
    // Check if any match is invalid
    const invalidMatches = editedMatches.filter(match => !match.isValid);
    if (invalidMatches.length > 0) {
      toast({
        title: "Validation Error",
        description: "Some matches have invalid scores. Please ensure all scores are valid numbers.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Process matches one by one to handle winner_id and loser_id
      for (const match of editedMatches) {
        if (match.team1Score !== null && match.team2Score !== null) {
          let winnerId = null;
          let loserId = null;
          
          // Determine winner and loser
          if (match.team1Score > match.team2Score) {
            winnerId = match.team1Id;
            loserId = match.team2Id;
          } else if (match.team2Score > match.team1Score) {
            winnerId = match.team2Id;
            loserId = match.team1Id;
          }

          // Update match in database
          const { error } = await supabase
            .from('matches')
            .update({
              team1_score: match.team1Score,
              team2_score: match.team2Score,
              iscompleted: match.iscompleted,
              winner_id: winnerId,
              loser_id: loserId
            })
            .eq('id', match.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: `Updated ${editedMatches.length} match results successfully.`,
      });

      // Refresh the matches list
      fetchMatches();
    } catch (error: any) {
      console.error("Error updating matches:", error.message);
      toast({
        title: "Error",
        description: `Failed to update matches: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFilterDate(undefined);
    setBracketFilter(undefined);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TableProperties size={20} />
            Mass Score Entry
          </CardTitle>

          <div className="flex flex-col sm:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1 h-9">
                  <Calendar size={16} />
                  {filterDate ? format(filterDate, "MMM d, yyyy") : "Filter by Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={bracketFilter} onValueChange={setBracketFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by Bracket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>All Brackets</SelectItem>
                {brackets.map(bracket => (
                  <SelectItem key={bracket.id} value={bracket.id}>
                    {bracket.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <Filter size={16} className="mr-1" />
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No matches found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Date</TableHead>
                    <TableHead>Team 1</TableHead>
                    <TableHead className="text-center w-[100px]">Score</TableHead>
                    <TableHead className="text-center w-[100px]">Score</TableHead>
                    <TableHead>Team 2</TableHead>
                    <TableHead className="text-center w-[120px]">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match, index) => (
                    <TableRow 
                      key={match.id} 
                      className={
                        match.isEdited && !match.isValid ? "bg-red-50" :
                        match.isEdited ? "bg-blue-50" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {match.date && format(new Date(match.date), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {match.team1?.logoUrl && (
                            <img 
                              src={match.team1.logoUrl} 
                              alt={match.team1.name} 
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="font-medium">{match.team1?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={match.team1Score ?? ""}
                          onChange={(e) => handleScoreChange(index, 'team1', e.target.value)}
                          className="max-w-[80px] mx-auto text-center"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={match.team2Score ?? ""}
                          onChange={(e) => handleScoreChange(index, 'team2', e.target.value)}
                          className="max-w-[80px] mx-auto text-center"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {match.team2?.logoUrl && (
                            <img 
                              src={match.team2.logoUrl} 
                              alt={match.team2.name} 
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <span className="font-medium">{match.team2?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={match.iscompleted || false}
                            onCheckedChange={(checked) => 
                              handleMarkCompleted(index, checked as boolean)
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSubmitAll}
                disabled={submitting || matches.filter(m => m.isEdited).length === 0}
                className="flex items-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <Save size={16} />
                Submit All Changes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MassScoreEntryTool;
