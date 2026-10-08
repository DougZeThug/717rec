import { format } from 'date-fns';
import { CalendarIcon, ChevronRight, RefreshCw } from 'lucide-react';
import React from 'react';

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

interface DatePickerProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

const DatePickerLabel: React.FC<{ selectedDate: Date | null }> = ({ selectedDate }) => (
  <span className="flex items-center">
    <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
    {selectedDate ? (
      format(selectedDate, 'PPP')
    ) : (
      <span className="text-muted-foreground">Select a date</span>
    )}
  </span>
);

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full justify-between text-left font-normal">
        <DatePickerLabel selectedDate={selectedDate} />
        <ChevronRight className="size-4 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={selectedDate || undefined}
        onSelect={(date) => setSelectedDate(date ?? null)}
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
);

interface SwitchRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

const SwitchRow: React.FC<SwitchRowProps> = ({ id, label, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between space-x-2">
    <Label htmlFor={id} className="flex-1 text-sm">
      {label}
    </Label>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

interface MatchRulesSectionProps {
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  dualMatchMode: boolean;
  setDualMatchMode: (value: boolean) => void;
}

const MatchRulesSection: React.FC<MatchRulesSectionProps> = ({
  avoidRematches,
  setAvoidRematches,
  prioritizeQuality,
  setPrioritizeQuality,
  dualMatchMode,
  setDualMatchMode,
}) => (
  <div className="space-y-3">
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Match Rules
    </h4>

    <SwitchRow
      id="avoid-rematches"
      label="Avoid Rematches"
      checked={avoidRematches}
      onCheckedChange={setAvoidRematches}
    />

    {!dualMatchMode && (
      <SwitchRow
        id="prioritize-quality"
        label="Prioritize Match Quality"
        checked={prioritizeQuality}
        onCheckedChange={setPrioritizeQuality}
      />
    )}

    <div className="space-y-2">
      <SwitchRow
        id="dual-match-mode"
        label="Dual Match Mode"
        checked={dualMatchMode}
        onCheckedChange={setDualMatchMode}
      />
      {dualMatchMode && (
        <p className="text-xs text-muted-foreground">
          Teams will play 2 matches in consecutive time blocks based on their assigned timeslots.
        </p>
      )}
    </div>
  </div>
);

interface DateSectionProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

const DateSection: React.FC<DateSectionProps> = ({ selectedDate, setSelectedDate }) => (
  <div>
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
      Date
    </h4>
    <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
  </div>
);

interface ActionButtonsProps {
  selectedDate: Date | null;
  isLoading: boolean;
  isGenerating: boolean;
  totalTeams: number;
  onLoadTeams: () => Promise<void>;
  onGenerateSchedule: () => Promise<void>;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  selectedDate,
  isLoading,
  isGenerating,
  totalTeams,
  onLoadTeams,
  onGenerateSchedule,
}) => (
  <div className="space-y-3">
    <Button
      onClick={onLoadTeams}
      disabled={!selectedDate || isLoading}
      variant="secondary"
      className="w-full flex items-center justify-center"
    >
      {isLoading ? (
        <>
          <RefreshCw className="mr-2 size-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 size-4" />
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
          <RefreshCw className="mr-2 size-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          Generate Schedule
          <ChevronRight className="ml-2 size-4" />
        </>
      )}
    </Button>
  </div>
);

interface StatusDisplayProps {
  formattedDate: string;
  totalTeams: number;
  oddBlocks: number;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ formattedDate, totalTeams, oddBlocks }) => (
  <div className="bg-muted rounded-md p-2 text-sm">
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
);

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
          <DateSection selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

          {/* Match Rules Section */}
          <MatchRulesSection
            avoidRematches={avoidRematches}
            setAvoidRematches={setAvoidRematches}
            prioritizeQuality={prioritizeQuality}
            setPrioritizeQuality={setPrioritizeQuality}
            dualMatchMode={dualMatchMode}
            setDualMatchMode={setDualMatchMode}
          />

          <Separator />

          {/* Action Buttons */}
          <ActionButtons
            selectedDate={selectedDate}
            isLoading={isLoading}
            isGenerating={isGenerating}
            totalTeams={totalTeams}
            onLoadTeams={onLoadTeams}
            onGenerateSchedule={onGenerateSchedule}
          />

          {/* Status Display */}
          {totalTeams > 0 && (
            <StatusDisplay
              formattedDate={formattedDate}
              totalTeams={totalTeams}
              oddBlocks={oddBlocks}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DateSettingsPanel;
