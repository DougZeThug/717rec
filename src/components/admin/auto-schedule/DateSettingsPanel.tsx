
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { Accordion } from "@/components/ui/accordion";
import { Calendar } from "lucide-react";
import AlgorithmSettings from "./AlgorithmSettings";

interface DateSettingsPanelProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  isLoading: boolean;
  isGenerating: boolean;
  totalTeams: number;
  oddBlocks: number;
  formattedDate?: string;
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
  isLoading,
  isGenerating,
  totalTeams,
  oddBlocks,
  formattedDate,
  onLoadTeams,
  onGenerateSchedule
}) => {
  // Handle date selection to ensure UTC consistency
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Create a date at midnight UTC to avoid timezone issues
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create a new date at 12:00 PM to avoid timezone issues
      const normalizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      console.log("Date selection changed:", {
        originalDate: date,
        normalizedDate,
        dateString: normalizedDate.toString(),
        utcString: normalizedDate.toUTCString(),
        isoString: normalizedDate.toISOString()
      });
      setSelectedDate(normalizedDate);
    } else {
      setSelectedDate(null);
    }
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Select Date
        </CardTitle>
        {formattedDate && (
          <p className="text-xs text-muted-foreground mt-1">
            {formattedDate}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <DatePicker
            date={selectedDate}
            onDateChange={handleDateChange}
          />
          
          <Separator className="my-4" />
          
          <Accordion type="single" collapsible>
            <AlgorithmSettings 
              avoidRematches={avoidRematches}
              setAvoidRematches={setAvoidRematches}
              prioritizeQuality={prioritizeQuality}
              setPrioritizeQuality={setPrioritizeQuality}
            />
          </Accordion>
          
          <div className="pt-4 space-y-4">
            <Button
              onClick={onLoadTeams}
              className="w-full"
              disabled={isLoading || !selectedDate}
              variant="secondary"
            >
              {isLoading ? "Loading..." : "Load Teams"}
            </Button>
            
            <Button
              onClick={onGenerateSchedule}
              className="w-full"
              variant="default"
              disabled={isGenerating || totalTeams === 0}
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
  );
};

export default DateSettingsPanel;
