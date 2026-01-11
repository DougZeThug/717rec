import { ChevronDown, Settings } from 'lucide-react';
import React from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { FormSectionProps } from './types';

interface AdvancedSettingsSectionProps extends FormSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  formData,
  onChange,
  isOpen,
  onOpenChange,
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full bg-muted/50 rounded-lg border p-4 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Advanced Settings</span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <p className="text-xs text-muted-foreground italic">
            These settings are for technical customization. Most cards don't need these.
          </p>

          <div>
            <Label htmlFor="background_color_raw">Custom Background (Tailwind)</Label>
            <Input
              id="background_color_raw"
              value={formData.background_color}
              onChange={(e) => onChange('background_color', e.target.value)}
              placeholder="bg-gradient-to-r from-blue-600 to-amber-500"
            />
          </div>

          <div>
            <Label htmlFor="text_color_raw">Custom Text Color (Tailwind)</Label>
            <Input
              id="text_color_raw"
              value={formData.text_color}
              onChange={(e) => onChange('text_color', e.target.value)}
              placeholder="text-white"
            />
          </div>

          <div>
            <Label htmlFor="accent_color">Accent Color (Tailwind)</Label>
            <Input
              id="accent_color"
              value={formData.accent_color}
              onChange={(e) => onChange('accent_color', e.target.value)}
              placeholder="text-amber-300"
            />
          </div>

          <div>
            <Label htmlFor="icon_name_raw">Icon Name (raw)</Label>
            <Input
              id="icon_name_raw"
              value={formData.icon_name}
              onChange={(e) => onChange('icon_name', e.target.value)}
              placeholder="Trophy, Star, Calendar, etc."
            />
          </div>

          <div>
            <Label htmlFor="metadata">Extra Data (JSON)</Label>
            <Textarea
              id="metadata"
              value={formData.metadata}
              onChange={(e) => onChange('metadata', e.target.value)}
              placeholder="{}"
              rows={4}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
