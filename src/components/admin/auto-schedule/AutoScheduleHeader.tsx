
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Wand2 } from "lucide-react";

const AutoScheduleHeader: React.FC = () => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default AutoScheduleHeader;
