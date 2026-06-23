import { MousePointer } from 'lucide-react';
import React, { useCallback } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

export const CallToActionSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const handleCtaLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange('cta_label', event.target.value);
    },
    [onChange]
  );

  const handleCtaUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange('cta_url', event.target.value);
    },
    [onChange]
  );

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={MousePointer} title="Call to Action" />

      <div className="space-y-4">
        <div>
          <Label htmlFor="cta_label">Button Text</Label>
          <Input
            id="cta_label"
            value={formData.cta_label}
            onChange={handleCtaLabelChange}
            placeholder="e.g., View Schedule, Learn More"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank if you don't want a button
          </p>
        </div>

        <div>
          <Label htmlFor="cta_url">Button Link</Label>
          <Input
            id="cta_url"
            value={formData.cta_url}
            onChange={handleCtaUrlChange}
            placeholder="e.g., /schedule or https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Where should clicking the button take players?
          </p>
        </div>
      </div>
    </div>
  );
};
