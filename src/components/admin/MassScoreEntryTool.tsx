
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, TableProperties } from "lucide-react";
import { useScoreEntryData } from "./mass-score-entry/useScoreEntryData";
import FilterBar from "./mass-score-entry/FilterBar";
import MatchesTable from "./mass-score-entry/MatchesTable";

interface MassScoreEntryToolProps {}

const MassScoreEntryTool: React.FC<MassScoreEntryToolProps> = () => {
  const {
    matches,
    loading,
    submitting,
    brackets,
    filters,
    handleScoreChange,
    handleMarkCompleted,
    handleSubmitAll,
    setFilterDate,
    setBracketFilter,
    clearFilters
  } = useScoreEntryData();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <TableProperties size={20} />
            Mass Score Entry
          </CardTitle>

          <FilterBar
            filters={filters}
            brackets={brackets}
            onDateChange={setFilterDate}
            onBracketChange={setBracketFilter}
            onClearFilters={clearFilters}
          />
        </div>
      </CardHeader>

      <CardContent>
        <MatchesTable
          matches={matches}
          loading={loading}
          onScoreChange={handleScoreChange}
          onMarkCompleted={handleMarkCompleted}
        />

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
      </CardContent>
    </Card>
  );
};

export default MassScoreEntryTool;
