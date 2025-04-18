
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, TableProperties, AlertCircle } from "lucide-react";
import { useScoreEntryData } from "./mass-score-entry/hooks/useScoreEntryData";
import FilterBar from "./mass-score-entry/FilterBar";
import MatchesTable from "./mass-score-entry/MatchesTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MassScoreEntryToolProps {}

const MassScoreEntryTool: React.FC<MassScoreEntryToolProps> = () => {
  const {
    matches,
    loading,
    submitting,
    failedMatches,
    errorMessages,
    brackets,
    filters,
    handleScoreChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearError,
    setFilterDate,
    setBracketFilter,
    clearFilters
  } = useScoreEntryData();

  // Count edited matches that are valid
  const validEditedMatchesCount = matches.filter(m => m.isEdited && m.isValid).length;
  
  // Determine if submission should be disabled
  const disableSubmit = submitting || validEditedMatchesCount === 0;

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
        {failedMatches && failedMatches.length > 0 && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {failedMatches.length} {failedMatches.length === 1 ? 'match' : 'matches'} failed to update. 
              Please correct the errors and resubmit.
            </AlertDescription>
          </Alert>
        )}
        
        <MatchesTable
          matches={matches}
          loading={loading}
          submitting={submitting}
          failedMatches={failedMatches}
          errorMessages={errorMessages}
          onScoreChange={handleScoreChange}
          onMarkCompleted={handleMarkCompleted}
          onClearError={clearError}
        />

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSubmitAll}
            disabled={disableSubmit}
            className="flex items-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            <Save size={16} />
            {submitting ? "Processing..." : "Submit All Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MassScoreEntryTool;
