import React from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TargetTypeSelector, TargetEntitySelector } from "../TargetSelector";
import { FormSectionProps } from "./types";
import { SectionHeader } from "./SectionHeader";

export const TargetingDisplaySection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Target} title="Targeting & Display" />
      
      <div className="space-y-4">
        <TargetTypeSelector
          value={formData.target_type}
          onChange={(v) => {
            onChange('target_type', v);
            if (v === 'none') onChange('target_id', '');
          }}
        />

        <TargetEntitySelector
          targetType={formData.target_type}
          value={formData.target_id}
          onChange={(v) => onChange('target_id', v)}
        />

        <div>
          <Label htmlFor="sort_order">Display Order</Label>
          <Input
            id="sort_order"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.sort_order}
            onChange={(e) => onChange('sort_order', parseInt(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cards with lower numbers appear first on the homepage
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <Label htmlFor="is_visible" className="cursor-pointer">Show on Homepage</Label>
            <p className="text-xs text-muted-foreground">
              Toggle to make this card visible to players
            </p>
          </div>
          <Switch
            id="is_visible"
            checked={formData.is_visible}
            onCheckedChange={(checked) => onChange('is_visible', checked)}
          />
        </div>
      </div>
    </div>
  );
};
