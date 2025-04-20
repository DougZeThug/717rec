import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useScoreEntryData } from "./mass-score-entry/hooks/useScoreEntryData";
import MatchesTable from "./mass-score-entry/MatchesTable";
import ScoreEntryToolbar from "./mass-score-entry/components/ScoreEntryToolbar";
import ErrorAlert from "./mass-score-entry/components/ErrorAlert";
import SubmitButton from "./mass-score-entry/components/SubmitButton";

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
    handleGameWinsChange,
    handleMarkCompleted,
    handleSubmitAll,
    clearErrors,
    setFilterDate,
    setBracketFilter,
    clearFilters
  } = useScoreEntryData();

  // Count edited matches that are valid
  const validEditedMatchesCount = matches.filter(m => m.isEdited && m.isValid).length;
  
  // Determine if submission should be disabled
  const disableSubmit = submitting || validEditedMatchesCount === 0;

  return (
    <Card className="mx-auto max-w-full">
      <CardHeader className="p-3 sm:p-4">
        <ScoreEntryToolbar
          filters={filters}
          brackets={brackets}
          onDateChange={setFilterDate}
          onBracketChange={setBracketFilter}
          onClearFilters={clearFilters}
        />
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <ErrorAlert failedMatches={failedMatches} />
        
        <div className="w-full">
          <MatchesTable
            matches={matches}
            loading={loading}
            submitting={submitting}
            failedMatches={failedMatches}
            errorMessages={errorMessages}
            onScoreChange={handleScoreChange}
            onGameWinsChange={handleGameWinsChange}
            onMarkCompleted={handleMarkCompleted}
            onClearError={clearErrors}
          />
        </div>

        <div className="flex justify-end mt-6">
          <SubmitButton
            onSubmit={handleSubmitAll}
            disabled={disableSubmit}
            submitting={submitting}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MassScoreEntryTool;
