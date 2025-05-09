
import React, { useState } from "react";
import { useTeamData } from "@/hooks/useTeamData";
import { ThursdayDatePicker } from "./ThursdayDatePicker";
import MatchPairsList from "./MatchPairsList";
import BatchMatchFormActions from "./BatchMatchFormActions";
import { useBatchMatchForm } from "./useBatchMatchForm";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, Wand2, AlertTriangle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAutoSchedule } from "@/hooks/useAutoSchedule";
import SchedulePreview from "./SchedulePreview";
import ScheduleMatchesPreview from "./ScheduleMatchesPreview";
import { TIME_BLOCKS } from "@/utils/autoScheduleUtils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const BatchMatchForm = () => {
  const { data: teams, isLoading } = useTeamData();
  const { toast } = useToast();
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isSubmitting, setIsSubmittingLocal] = useState(false);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [autoScheduleStep, setAutoScheduleStep] = useState<'teams' | 'pairings'>('teams');

  const {
    selectedDate,
    setSelectedDate,
    matchPairs,
    isSubmitting: formSubmitting,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit,
    setMatchPairs
  } = useBatchMatchForm(teams || []);

  const {
    isGenerating,
    loadTeamsForDate,
    previewSchedule,
    generateMatchPairings,
    convertPairingsToMatches,
    timeBlockTeams,
    generatedPairings
  } = useAutoSchedule();

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

  const handlePreviewTeams = async () => {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return;
    }
    
    const preview = await previewSchedule(selectedDate);
    if (preview) {
      toast({
        title: "Teams Loaded",
        description: "Teams for each time block have been loaded.",
      });
      setAutoScheduleStep('teams');
    }
  };

  const handleGenerateSchedule = async () => {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return;
    }
    
    const pairings = await generateMatchPairings(selectedDate);
    if (pairings) {
      toast({
        title: "Schedule Generated",
        description: "Match pairings have been generated based on team compatibility.",
      });
      setAutoScheduleStep('pairings');
    }
  };

  const handleApplySchedule = () => {
    if (!generatedPairings || !selectedDate) {
      toast({
        title: "Error",
        description: "No schedule has been generated yet.",
        variant: "destructive"
      });
      return;
    }

    const newMatchPairs = convertPairingsToMatches(generatedPairings, selectedDate);
    
    if (newMatchPairs.length === 0) {
      toast({
        title: "Error",
        description: "No valid match pairings were generated.",
        variant: "destructive"
      });
      return;
    }
    
    // Update the match pairs list with generated matches
    setMatchPairs(newMatchPairs);
    
    toast({
      title: "Schedule Applied",
      description: `${newMatchPairs.length} matches have been added to the form.`,
    });
  };

  const getTeamCountStatus = () => {
    if (!timeBlockTeams || Object.keys(timeBlockTeams).length === 0) {
      return { total: 0, odd: 0 };
    }
    
    let totalTeams = 0;
    let oddBlocks = 0;
    
    Object.entries(timeBlockTeams).forEach(([block, teams]) => {
      totalTeams += teams.length;
      if (teams.length % 2 !== 0) oddBlocks++;
    });
    
    return { total: totalTeams, odd: oddBlocks };
  };
  
  const { total: totalTeams, odd: oddBlocks } = getTeamCountStatus();

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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Match Pairings</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Auto Schedule</span>
          <Switch 
            checked={showAutoSchedule} 
            onCheckedChange={setShowAutoSchedule}
          />
        </div>
      </div>

      {showAutoSchedule && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> 
              <span>Schedule Generator</span>
              <Badge variant="outline" className="ml-2">Beta</Badge>
            </h3>
            
            <div className="flex items-center gap-2">
              {totalTeams > 0 && (
                <Badge variant={oddBlocks > 0 ? "destructive" : "outline"} className="text-xs">
                  {totalTeams} Teams {oddBlocks > 0 && `(${oddBlocks} Odd Blocks)`}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate matches automatically using teams assigned to time blocks for this date.
              The algorithm will pair teams based on their skill level and match history.
            </p>
            
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</div>
                  <h4 className="font-medium">Load Available Teams</h4>
                </div>
                <div className="pl-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    Load teams that have been assigned to time blocks for this date
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePreviewTeams}
                    disabled={isGenerating || !selectedDate}
                    className="w-full mb-4"
                  >
                    {isGenerating ? "Loading Teams..." : "Preview Available Teams"}
                  </Button>
                </div>
              </div>
              
              {/* Only show preview if teams are loaded */}
              {Object.keys(timeBlockTeams).length > 0 && autoScheduleStep === 'teams' && (
                <div className="pl-8 mb-4">
                  <SchedulePreview 
                    timeBlockTeams={timeBlockTeams}
                    date={selectedDate}
                  />
                  
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleGenerateSchedule}
                      disabled={isGenerating || totalTeams === 0}
                      className="flex items-center"
                    >
                      Generate Match Pairings <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {Object.keys(generatedPairings).length > 0 && autoScheduleStep === 'pairings' && (
                <div>
                  <div className="flex items-center mb-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">2</div>
                    <h4 className="font-medium">Review Generated Matches</h4>
                  </div>
                  
                  <div className="pl-8 mb-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Review the generated match pairings and apply them to the form
                    </p>
                    
                    <ScheduleMatchesPreview 
                      pairings={generatedPairings}
                      date={selectedDate}
                      isGenerating={isGenerating}
                    />
                    
                    <div className="mt-4 flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoScheduleStep('teams')}
                      >
                        Back to Teams
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleApplySchedule}
                        disabled={isGenerating}
                      >
                        Apply Schedule to Form
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {oddBlocks > 0 && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-medium">Odd number of teams detected</p>
                <p className="mt-1">Some time blocks have an odd number of teams, which means not all teams can be paired. Consider adding or removing teams to ensure an even number.</p>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="text-xs text-muted-foreground mt-2">
            <p>* Teams are matched based on skill levels using power scores and win records</p>
            <p>* Teams will be warned if they're in a time block with an odd number of teams</p>
            <p>* Generated schedule can be manually adjusted after applying to the form</p>
          </div>
        </motion.div>
      )}

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
