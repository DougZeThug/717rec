
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DualBlockConfig } from "@/types/autoSchedule";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BACK_TO_BACK_PAIRS } from "@/utils/autoSchedule/constants";

interface DateSettingsPanelProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  dualMatchMode: boolean;
  setDualMatchMode: (value: boolean) => void;
  isLoading: boolean;
  isGenerating: boolean;
  totalTeams: number;
  oddBlocks: number;
  formattedDate: string;
  onLoadTeams: () => Promise<void>;
  onGenerateSchedule: () => Promise<void>;
}

const DateSettingsPanel: React.FC<DateSettingsPanelProps> = ({
  selectedDate,
  setSelectedDate,
  avoidRematches,
  setAvoidRematches,
  prioritizeQuality,
  setPrioritizeQuality,
  dualMatchMode,
  setDualMatchMode,
  isLoading,
  isGenerating,
  totalTeams,
  oddBlocks,
  formattedDate,
  onLoadTeams,
  onGenerateSchedule
}) => {
  // State for dual block configuration
  const [dualBlockConfig, setDualBlockConfig] = useState<DualBlockConfig>({
    primaryBlock: 'Early',
    secondaryBlock: 'Late',
    unmatchedTeamStrategy: 'lowest-rank'
  });

  // Handle dual block primary block selection
  const handlePrimaryBlockChange = (value: string) => {
    setDualBlockConfig(prev => ({
      ...prev,
      primaryBlock: value,
      // If same block selected for both, swap them
      secondaryBlock: prev.secondaryBlock === value ? prev.primaryBlock : prev.secondaryBlock
    }));
  };
  
  // Handle dual block secondary block selection
  const handleSecondaryBlockChange = (value: string) => {
    setDualBlockConfig(prev => ({
      ...prev,
      secondaryBlock: value,
      // If same block selected for both, swap them
      primaryBlock: prev.primaryBlock === value ? prev.secondaryBlock : prev.primaryBlock
    }));
  };
  
  // Handle strategy selection for unmatched teams
  const handleStrategyChange = (value: string) => {
    setDualBlockConfig(prev => ({
      ...prev,
      unmatchedTeamStrategy: value as 'random' | 'lowest-rank' | 'highest-rank'
    }));
  };

  return (
    <div className="lg:col-span-1">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Settings</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div>
            <h4 className="text-sm font-medium mb-2">Date Selection</h4>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Select a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Algorithm Settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium mb-2">Algorithm Settings</h4>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="avoid-rematches" className="flex-1">
                Avoid Rematches
              </Label>
              <Switch
                id="avoid-rematches"
                checked={avoidRematches}
                onCheckedChange={setAvoidRematches}
              />
            </div>
            
            {!dualMatchMode && (
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="prioritize-quality" className="flex-1">
                  Prioritize Match Quality
                </Label>
                <Switch
                  id="prioritize-quality"
                  checked={prioritizeQuality}
                  onCheckedChange={setPrioritizeQuality}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="dual-match-mode" className="flex-1">
                Dual Match Mode
              </Label>
              <Switch
                id="dual-match-mode"
                checked={dualMatchMode}
                onCheckedChange={setDualMatchMode}
              />
            </div>
            
            {/* Dual Block Configuration - only show when dual match mode is enabled */}
            {dualMatchMode && (
              <div className="mt-4 space-y-3 border rounded-md p-3 bg-slate-50 dark:bg-slate-900">
                <h5 className="text-sm font-medium">Dual Block Configuration</h5>
                
                <div className="space-y-2">
                  <Label htmlFor="primary-block">Primary Time Block</Label>
                  <Select 
                    value={dualBlockConfig.primaryBlock} 
                    onValueChange={handlePrimaryBlockChange}
                  >
                    <SelectTrigger id="primary-block">
                      <SelectValue placeholder="Select primary block" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BACK_TO_BACK_PAIRS).map(([pairName, config]) => (
                        <SelectItem key={pairName} value={pairName}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondary-block">Secondary Time Block</Label>
                  <Select 
                    value={dualBlockConfig.secondaryBlock} 
                    onValueChange={handleSecondaryBlockChange}
                  >
                    <SelectTrigger id="secondary-block">
                      <SelectValue placeholder="Select secondary block" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BACK_TO_BACK_PAIRS).map(([pairName, config]) => (
                        <SelectItem key={pairName} value={pairName}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unmatched-strategy">Unmatched Teams Strategy</Label>
                  <Select 
                    value={dualBlockConfig.unmatchedTeamStrategy || 'lowest-rank'} 
                    onValueChange={handleStrategyChange}
                  >
                    <SelectTrigger id="unmatched-strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lowest-rank">Lowest Ranked Team</SelectItem>
                      <SelectItem value="highest-rank">Highest Ranked Team</SelectItem>
                      <SelectItem value="random">Random Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onLoadTeams}
              disabled={!selectedDate || isLoading}
              variant="secondary"
              className="w-full flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load Teams
                </>
              )}
            </Button>
            
            <Button
              onClick={onGenerateSchedule}
              disabled={isGenerating || !selectedDate || totalTeams === 0}
              className="w-full flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Schedule
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Status Display */}
          {totalTeams > 0 && (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-2 text-sm">
              <p>
                Date: <span className="font-medium">{formattedDate}</span>
              </p>
              <p>
                Teams: <span className="font-medium">{totalTeams}</span>
                {oddBlocks > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({oddBlocks} block{oddBlocks === 1 ? '' : 's'} with odd number of teams)
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DateSettingsPanel;
