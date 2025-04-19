
import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { ThursdayDatePicker } from "./ThursdayDatePicker";
import MatchPairsList from "./MatchPairsList";
import BatchMatchFormActions from "./BatchMatchFormActions";
import { useBatchMatchForm } from "./useBatchMatchForm";
import { Card, CardContent } from "@/components/ui/card";

const BatchMatchForm = () => {
  const { data: teams, isLoading } = useTeamData();
  const {
    selectedDate,
    setSelectedDate,
    matchPairs,
    isSubmitting,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit
  } = useBatchMatchForm(teams || []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center">
            <p>Loading teams data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full">
        <ThursdayDatePicker
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      </div>

      <MatchPairsList
        pairs={matchPairs}
        teams={teams || []}
        onUpdate={updateMatchPair}
        onRemove={removeMatchPair}
      />

      <BatchMatchFormActions
        onAutoAssign={autoAssignTimeslots}
        onAddMatch={addMatchPair}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default BatchMatchForm;
