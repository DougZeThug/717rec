
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { MatchPair } from "./MatchPairsList";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Wand2 } from "lucide-react";
import { useSchedulePreview } from "@/hooks/useSchedulePreview";
import { TeamLoadingStep } from "./auto-schedule/TeamLoadingStep";
import { ScheduleGenerationStep } from "./auto-schedule/ScheduleGenerationStep";
import { WarningDisplay } from "./auto-schedule/WarningDisplay";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AutoScheduleSectionProps {
  selectedDate: Date | null;
  matchPairs: MatchPair[];
  setMatchPairs: React.Dispatch<React.SetStateAction<MatchPair[]>>;
}

export const AutoScheduleSection: React.FC<AutoScheduleSectionProps> = ({
  selectedDate,
  matchPairs,
  setMatchPairs
}) => {
  const { toast } = useToast();
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  
  const {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus
  } = useSchedulePreview();

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
    }
  };

  const handleGenerateScheduleClick = async () => {
    if (!selectedDate) {
      toast({
        title: "Select Date",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return;
    }
    
    // Pass configuration options to the generation function
    await handleGenerateSchedule(selectedDate, {
      avoidRematches,
      prioritizeQuality,
      weights: prioritizeQuality ? {
        // Increase power score and record weights for higher quality matches
        powerScoreWeight: 5,
        recordWeight: 3.5
      } : undefined
    });
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
  
  const { total: totalTeams, odd: oddBlocks } = getTeamCountStatus();

  return (
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
        
        {/* Settings Accordion */}
        <Accordion type="single" collapsible className="mb-4">
          <AccordionItem value="settings">
            <AccordionTrigger className="text-sm py-2">
              <span className="flex items-center">
                <Settings2 className="h-4 w-4 mr-2" /> Algorithm Settings
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="avoid-rematches">Avoid Rematches</Label>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Prioritize pairing teams that haven't played each other before
                    </p>
                  </div>
                  <Switch
                    id="avoid-rematches"
                    checked={avoidRematches}
                    onCheckedChange={setAvoidRematches}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="prioritize-quality">Prioritize Match Quality</Label>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Match teams with similar skill levels (higher priority)
                    </p>
                  </div>
                  <Switch
                    id="prioritize-quality"
                    checked={prioritizeQuality}
                    onCheckedChange={setPrioritizeQuality}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className="flex flex-col space-y-4">
          {autoScheduleStep === 'teams' && (
            <TeamLoadingStep 
              isLoading={isLoading} 
              selectedDate={selectedDate}
              timeBlockTeams={timeBlockTeams}
              totalTeams={totalTeams}
              oddBlocks={oddBlocks}
              unmatchedTeamIds={unmatchedTeamIds}
              onLoadTeams={handlePreviewTeams}
              onGenerateSchedule={handleGenerateScheduleClick}
            />
          )}
          
          {autoScheduleStep === 'pairings' && Object.keys(generatedPairings).length > 0 && (
            <ScheduleGenerationStep 
              isGenerating={isGenerating}
              selectedDate={selectedDate}
              generatedPairings={generatedPairings}
              onApplySchedule={handleApplySchedule}
              onBack={() => setAutoScheduleStep('teams')}
            />
          )}
        </div>
      </div>
      
      <WarningDisplay 
        oddBlocks={oddBlocks} 
        unmatchedTeams={unmatchedTeamIds?.length || 0}
      />
      
      <Separator className="my-4" />
      
      <div className="text-xs text-muted-foreground mt-2">
        <p>* Teams are matched based on skill levels using power scores and win records</p>
        <p>* Teams with odd numbers will have some teams unmatched (shown with warning)</p>
        <p>* Generated schedule can be manually adjusted after applying to the form</p>
      </div>
    </motion.div>
  );
};
