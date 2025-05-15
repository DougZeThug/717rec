
import React from "react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";

interface AlgorithmSettingsProps {
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  dualMatchMode: boolean;
  setDualMatchMode: (value: boolean) => void;
}

const AlgorithmSettings: React.FC<AlgorithmSettingsProps> = ({
  avoidRematches,
  setAvoidRematches,
  prioritizeQuality,
  setPrioritizeQuality,
  dualMatchMode,
  setDualMatchMode
}) => {
  return (
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
              <Label htmlFor="dual-match-mode">Dual Match Mode</Label>
              <p className="text-[0.8rem] text-muted-foreground">
                Each team plays in two consecutive time blocks (6:30 & 7:00)
              </p>
            </div>
            <Switch
              id="dual-match-mode"
              checked={dualMatchMode}
              onCheckedChange={setDualMatchMode}
            />
          </div>
          
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
  );
};

export default AlgorithmSettings;
