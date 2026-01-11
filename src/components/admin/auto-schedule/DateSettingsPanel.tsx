import { format } from 'date-fns';
import { CalendarIcon, ChevronRight, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

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
  onGenerateSchedule,
}) => {
  return (
    <div className="lg:col-span-1">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Settings</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date Section */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Date
            </h4>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left font-normal">
                  <span className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {selectedDate ? (
                      format(selectedDate, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">Select a date</span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(date) => setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Match Rules Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Match Rules
            </h4>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="avoid-rematches" className="flex-1 text-sm">
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
                <Label htmlFor="prioritize-quality" className="flex-1 text-sm">
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
                <Label htmlFor="dual-match-mode" className="flex-1 text-sm">
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
                  Teams will play 2 matches in consecutive time blocks based on their assigned
                  timeslots.
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
