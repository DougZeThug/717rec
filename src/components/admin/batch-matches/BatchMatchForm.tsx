
import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { ThursdayDatePicker } from "./ThursdayDatePicker";
import MatchPairsList from "./MatchPairsList";
import BatchMatchFormActions from "./BatchMatchFormActions";
import { useBatchMatchForm } from "./useBatchMatchForm";

const BatchMatchForm = () => {
  const { data: teams } = useTeamData();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <ThursdayDatePicker
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
        
        <BatchMatchFormActions
          onAutoAssign={autoAssignTimeslots}
          onAddMatch={addMatchPair}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      <MatchPairsList
        pairs={matchPairs}
        teams={teams || []}
        onUpdate={updateMatchPair}
        onRemove={removeMatchPair}
      />
    </div>
  );
};

export default BatchMatchForm;
