import React, { useState } from "react";
import { Calendar, Settings2, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSchedulePreview } from "@/hooks/useSchedulePreview";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WarningDisplay } from "@/components/admin/batch-matches/auto-schedule/WarningDisplay";
import { TimeBlockTeamsList } from "@/components/admin/batch-matches/auto-schedule/TimeBlockTeamsList";
import SchedulePreview from "@/components/admin/batch-matches/auto-schedule/SchedulePreview";
import ScheduleMatchesPreview from "@/components/admin/batch-matches/auto-schedule/ScheduleMatchesPreview";
import { TeamPairingMap } from "@/types/autoSchedule";
import { useIsMobile } from "@/hooks/use-mobile";

const AutoScheduleTab = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<string>("teams");
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  const isMobile = useIsMobile();
  
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

  const handleLoadTeams = async () => {
    if (!selectedDate) return;
    await previewSchedule(selectedDate);
  };

  const handleGenerateClick = async () => {
    if (!selectedDate) return;
    
    await handleGenerateSchedule(selectedDate, {
      avoidRematches,
      prioritizeQuality,
      weights: prioritizeQuality ? {
        powerScoreWeight: 5,
        recordWeight: 3.5
      } : undefined
    });
    
    setActiveTab("matches");
  };

  const handleApplySchedule = () => {
    if (!generatedPairings || !selectedDate) return;
    
    const matches = convertPairingsToMatches(generatedPairings, selectedDate);
    setGeneratedMatches(matches);
    
    // Show the export tab with the created matches
    setActiveTab("export");
  };

  const { total: totalTeams, odd: oddBlocks } = getTeamCountStatus();
  
  // Short tab labels for mobile
  const getTabLabel = (tab: string) => {
    if (isMobile) {
      switch(tab) {
        case "teams": return "Teams";
        case "matches": return "Matches";
        case "export": return "Export";
        default: return tab;
      }
    }
    
    return {
      "teams": "Available Teams",
      "matches": "Generated Matches",
      "export": "Export Schedule"
    }[tab] || tab;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Auto Schedule Generator</h2>
          <Badge variant="outline" className="ml-2">Beta</Badge>
        </div>
      </div>
      
      <p className="text-muted-foreground">
        Generate optimal match schedules automatically based on team compatibility and skill levels.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar with date and settings */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
              
              <Separator className="my-4" />
              
              <Accordion type="single" collapsible>
                <AccordionItem value="settings">
                  <AccordionTrigger className="text-sm">
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
              
              <div className="pt-4 space-y-4">
                <Button
                  onClick={handleLoadTeams}
                  className="w-full"
                  disabled={isLoading || !selectedDate}
                >
                  {isLoading ? "Loading..." : "Load Teams"}
                </Button>
                
                <Button
                  onClick={handleGenerateClick}
                  className="w-full"
                  variant="default"
                  disabled={isGenerating || totalTeams === 0 || !timeBlockTeams || Object.keys(timeBlockTeams).length === 0}
                >
                  {isGenerating ? "Generating..." : "Generate Schedule"}
                </Button>
              </div>
              
              {totalTeams > 0 && (
                <div className="flex justify-between items-center text-sm mt-2">
                  <span>Total Teams:</span>
                  <Badge variant={oddBlocks > 0 ? "destructive" : "outline"}>
                    {totalTeams} {oddBlocks > 0 && `(${oddBlocks} Odd Blocks)`}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Main content area with tabs */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Updated TabsList with better mobile styling */}
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="teams" className="px-1 sm:px-3 text-xs sm:text-sm">
                  <span className="truncate">{getTabLabel("teams")}</span>
                </TabsTrigger>
                <TabsTrigger value="matches" className="px-1 sm:px-3 text-xs sm:text-sm">
                  <span className="truncate">{getTabLabel("matches")}</span>
                </TabsTrigger>
                <TabsTrigger value="export" className="px-1 sm:px-3 text-xs sm:text-sm">
                  <span className="truncate">{getTabLabel("export")}</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="p-4">
                <TabsContent value="teams" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Teams by Time Block</h3>
                    <p className="text-sm text-muted-foreground">
                      Review teams assigned to each time block before generating the schedule.
                    </p>
                    
                    {totalTeams > 0 ? (
                      <SchedulePreview 
                        timeBlockTeams={timeBlockTeams}
                        date={selectedDate}
                        unmatchedTeamIds={unmatchedTeamIds}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Select a date and load teams to preview schedule</p>
                      </div>
                    )}
                    
                    {oddBlocks > 0 && (
                      <WarningDisplay
                        oddBlocks={oddBlocks}
                        unmatchedTeams={unmatchedTeamIds?.length || 0}
                      />
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="matches" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Generated Match Pairings</h3>
                    <p className="text-sm text-muted-foreground">
                      Review the generated match pairings based on team compatibility.
                    </p>
                    
                    {Object.keys(generatedPairings || {}).length > 0 ? (
                      <div className="space-y-4">
                        <ScheduleMatchesPreview
                          pairings={generatedPairings as TeamPairingMap}
                          date={selectedDate}
                          isGenerating={isGenerating}
                        />
                        
                        <div className="flex justify-end mt-4">
                          <Button onClick={handleApplySchedule}>
                            Export to Match Form
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Generate a schedule to see match pairings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="export" className="mt-0">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Export Schedule</h3>
                    <p className="text-sm text-muted-foreground">
                      The generated schedule can now be used in the Batch Matches tab.
                    </p>
                    
                    {generatedMatches.length > 0 ? (
                      <div className="space-y-4">
                        <div className="border rounded-md p-4 bg-muted/30">
                          <p className="text-center font-medium">
                            {generatedMatches.length} matches have been created
                          </p>
                          <p className="text-sm text-center text-muted-foreground mt-1">
                            Go to the Batch Matches tab to view and edit them
                          </p>
                        </div>
                        
                        <div className="flex justify-center mt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.href = "#batch-matches"}
                          >
                            Go to Batch Matches
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Export the generated schedule first</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-xs text-muted-foreground mt-2">
        <h4 className="font-medium mb-1">How Auto-scheduling Works:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Teams are matched based on skill levels using power scores and win records</li>
          <li>Algorithm avoids pairing teams that have already played against each other</li>
          <li>Matches are optimized to be as competitive and fair as possible</li>
          <li>Time blocks with odd numbers will have some teams unmatched</li>
        </ul>
      </div>
    </div>
  );
};

export default AutoScheduleTab;
