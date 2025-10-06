
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
            
            <div className="space-y-2">
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
              {dualMatchMode && (
                <p className="text-xs text-muted-foreground">
                  Teams will play 2 matches in consecutive time blocks based on their assigned timeslots.
                </p>
              )}
            </div>
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
