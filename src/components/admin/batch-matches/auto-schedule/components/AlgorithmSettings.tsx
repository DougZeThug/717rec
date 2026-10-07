import { Settings2 } from 'lucide-react';
import React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface AlgorithmSettingsProps {
  avoidRematches: boolean;
  setAvoidRematches: (value: boolean) => void;
  prioritizeQuality: boolean;
  setPrioritizeQuality: (value: boolean) => void;
  dualMatchMode?: boolean;
  setDualMatchMode?: (value: boolean) => void;
}

interface SettingRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean | undefined;
  onCheckedChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}) => (
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-[0.8rem] text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const SettingsTriggerLabel: React.FC = () => (
  <span className="flex items-center">
    <Settings2 className="size-4 mr-2" /> Algorithm Settings
  </span>
);

const SettingsBody: React.FC<AlgorithmSettingsProps> = ({
  avoidRematches,
  setAvoidRematches,
  prioritizeQuality,
  setPrioritizeQuality,
  dualMatchMode,
  setDualMatchMode,
}) => (
  <div className="space-y-4 py-2">
    {setDualMatchMode && (
      <SettingRow
        id="dual-match-mode"
        label="Dual Match Mode"
        description="Each team plays in two consecutive time blocks (6:30 & 7:00)"
        checked={dualMatchMode}
        onCheckedChange={setDualMatchMode}
      />
    )}

    <SettingRow
      id="avoid-rematches"
      label="Avoid Rematches"
      description="Prioritize pairing teams that haven't played each other before"
      checked={avoidRematches}
      onCheckedChange={setAvoidRematches}
    />

    {!dualMatchMode && (
      <SettingRow
        id="prioritize-quality"
        label="Prioritize Match Quality"
        description="Match teams with similar skill levels (higher priority)"
        checked={prioritizeQuality}
        onCheckedChange={setPrioritizeQuality}
      />
    )}
  </div>
);

export const AlgorithmSettings: React.FC<AlgorithmSettingsProps> = ({
  avoidRematches,
  setAvoidRematches,
  prioritizeQuality,
  setPrioritizeQuality,
  dualMatchMode,
  setDualMatchMode,
}) => {
  return (
    <Accordion type="single" collapsible className="mb-4">
      <AccordionItem value="settings">
        <AccordionTrigger className="text-sm py-2">
          <SettingsTriggerLabel />
        </AccordionTrigger>
        <AccordionContent>
          <SettingsBody
            avoidRematches={avoidRematches}
            setAvoidRematches={setAvoidRematches}
            prioritizeQuality={prioritizeQuality}
            setPrioritizeQuality={setPrioritizeQuality}
            dualMatchMode={dualMatchMode}
            setDualMatchMode={setDualMatchMode}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
