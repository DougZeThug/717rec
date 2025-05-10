
import React from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { useBatchMatchForm } from "./useBatchMatchForm";
import { DateSelectionSection } from "./DateSelectionSection";
import { MatchPairsSection } from "./MatchPairsSection";
import { AutoScheduleSection } from "./AutoScheduleSection";
import BatchMatchFormActions from "./BatchMatchFormActions";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";

const BatchMatchFormContainer = () => {
  const { data: teams, isLoading } = useTeamData();
  const { toast } = useToast();
  const [isAutoAssigning, setIsAutoAssigning] = React.useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = React.useState(false);
  
  const {
    selectedDate,
    setSelectedDate,
    matchPairs,
    isSubmitting,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit,
    setMatchPairs
  } = useBatchMatchForm(teams || []);

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    autoAssignTimeslots();
    
    // Show success toast after a brief delay
    setTimeout(() => {
      toast({
        title: "Auto-assigned Timeslots",
        description: "Timeslots have been automatically assigned to matches."
      });
      setIsAutoAssigning(false);
    }, 500);
  };
  
  const handleFormSubmit = async () => {
    const result = await handleSubmit();
    
    if (result !== false) {
      toast({
        title: "Matches Created",
        description: `Successfully created ${matchPairs.length} matches.`,
      });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading teams data..." size="md" />;
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <DateSelectionSection 
        selectedDate={selectedDate} 
        setSelectedDate={setSelectedDate} 
      />

      <MatchPairsSection 
        matchPairs={matchPairs}
        teams={teams || []}
        updateMatchPair={updateMatchPair}
        removeMatchPair={removeMatchPair}
        showAutoSchedule={showAutoSchedule}
        setShowAutoSchedule={setShowAutoSchedule}
      />

      {showAutoSchedule && (
        <AutoScheduleSection
          selectedDate={selectedDate}
          matchPairs={matchPairs}
          setMatchPairs={setMatchPairs}
        />
      )}
      
      <BatchMatchFormActions
        onAutoAssign={handleAutoAssign}
        onAddMatch={addMatchPair}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        isAutoAssigning={isAutoAssigning}
      />
    </div>
  );
};

export default BatchMatchFormContainer;
