import React from "react";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPresetPicker } from "../ColorPresetPicker";
import { IconPicker } from "../IconPicker";
import { FormSectionProps } from "./types";
import { SectionHeader } from "./SectionHeader";

export const DesignAppearanceSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Palette} title="Design & Appearance" />
      
      <div className="space-y-6">
        <div>
          <Label className="mb-3 block">Color Theme</Label>
          <ColorPresetPicker
            backgroundValue={formData.background_color}
            textValue={formData.text_color}
            onSelect={(bg, text) => {
              onChange('background_color', bg);
              onChange('text_color', text);
            }}
          />
        </div>

        <div>
          <Label className="mb-3 block">Icon</Label>
          <IconPicker
            value={formData.icon_name}
            onChange={(iconId) => onChange('icon_name', iconId)}
          />
        </div>

        <div>
          <Label htmlFor="image_url">Background Image URL (optional)</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => onChange('image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
};
