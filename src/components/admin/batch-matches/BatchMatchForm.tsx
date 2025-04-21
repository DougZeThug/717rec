
import React, { useState } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { ThursdayDatePicker } from "./ThursdayDatePicker";
import MatchPairsList from "./MatchPairsList";
import BatchMatchFormActions from "./BatchMatchFormActions";
import { useBatchMatchForm } from "./useBatchMatchForm";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const BatchMatchForm = () => {
  const { data: teams, isLoading } = useTeamData();
  const { toast } = useToast();
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isSubmitting, setIsSubmittingLocal] = useState(false);

  const {
    selectedDate,
    setSelectedDate,
    matchPairs,
    isSubmitting: formSubmitting,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit
  } = useBatchMatchForm(teams || []);

  // Update local state to reflect form state for animation purposes
  React.useEffect(() => {
    setIsSubmittingLocal(formSubmitting);
  }, [formSubmitting]);

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
    
    // Fix: Check if result is explicitly false, not just truthy/falsy
    if (result !== false) {
      toast({
        title: "Matches Created",
        description: `Successfully created ${matchPairs.length} matches.`,
      });
    }
  };

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
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Select Match Date</span>
        </div>
        <ThursdayDatePicker
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Select a Thursday for league play, or another date for special events
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Match Pairings</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Create team vs team pairings and assign timeslots
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <MatchPairsList
            pairs={matchPairs}
            teams={teams || []}
            onUpdate={updateMatchPair}
            onRemove={removeMatchPair}
          />
        </motion.div>
      </div>

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

export default BatchMatchForm;
