import { Target } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { TargetEntitySelector, TargetTypeSelector } from '../TargetSelector';
import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

const parseMetadata = (metadataStr: string): Record<string, any> => {
  try {
    return JSON.parse(metadataStr);
  } catch {
    return {};
  }
};

export const TargetingDisplaySection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const isEvent = formData.card_type === 'event';

  const handleEventActiveToggle = (checked: boolean) => {
    const metadata = parseMetadata(formData.metadata);
    metadata.is_active_event = checked;
    onChange('metadata', JSON.stringify(metadata, null, 2));
  };

  const getIsActiveEvent = (): boolean => {
    const metadata = parseMetadata(formData.metadata);
    return (metadata.is_active_event as boolean) ?? false;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Target} title="Targeting & Display" />

      <div className="space-y-4">
        {isEvent && (
          <div className="flex items-center justify-between py-2 border-b border-border pb-4">
            <div>
              <Label htmlFor="event_active" className="cursor-pointer">
                Event Active
              </Label>
              <p className="text-xs text-muted-foreground">
                When active, shows countdown, event details &amp; signup form
              </p>
            </div>
            <Switch
              id="event_active"
              checked={getIsActiveEvent()}
              onCheckedChange={handleEventActiveToggle}
            />
          </div>
        )}

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
            <Label htmlFor="is_visible" className="cursor-pointer">
              Show on Homepage
            </Label>
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
