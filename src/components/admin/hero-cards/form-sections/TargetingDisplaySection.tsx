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

  const metadata = parseMetadata(formData.metadata);

  const updateMetadataField = (key: string, value: any) => {
    const m = parseMetadata(formData.metadata);
    if (value === '' || value === null || value === undefined) {
      delete m[key];
    } else {
      m[key] = value;
    }
    onChange('metadata', JSON.stringify(m, null, 2));
  };

  const toDatetimeLocal = (iso: string | undefined): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      // Format as YYYY-MM-DDTHH:MM in local time
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const fromDatetimeLocal = (val: string): string => {
    if (!val) return '';
    return new Date(val).toISOString();
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Target} title="Targeting & Display" />

      <div className="space-y-4">
        {isEvent && (
          <>
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
                checked={(metadata.is_active_event as boolean) ?? false}
                onCheckedChange={(checked) => updateMetadataField('is_active_event', checked)}
              />
            </div>

            <div>
              <Label htmlFor="check_in_time">Check-in Time</Label>
              <Input
                id="check_in_time"
                type="datetime-local"
                value={toDatetimeLocal(metadata.check_in_time as string)}
                onChange={(e) => updateMetadataField('check_in_time', e.target.value ? fromDatetimeLocal(e.target.value) : '')}
              />
              <p className="text-xs text-muted-foreground mt-1">When check-in opens</p>
            </div>

            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={toDatetimeLocal(metadata.start_time as string)}
                onChange={(e) => updateMetadataField('start_time', e.target.value ? fromDatetimeLocal(e.target.value) : '')}
              />
              <p className="text-xs text-muted-foreground mt-1">Event start time (also determines signup date)</p>
            </div>

            <div>
              <Label htmlFor="buy_in">Buy-in</Label>
              <Input
                id="buy_in"
                type="text"
                placeholder="e.g. $10"
                value={(metadata.buy_in as string) ?? ''}
                onChange={(e) => updateMetadataField('buy_in', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="payouts">Payouts</Label>
              <Input
                id="payouts"
                type="text"
                placeholder="e.g. Top 3"
                value={(metadata.payouts as string) ?? ''}
                onChange={(e) => updateMetadataField('payouts', e.target.value)}
              />
            </div>
          </>
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
