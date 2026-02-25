import { ImageIcon, Palette } from 'lucide-react';
import React, { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ColorPresetPicker } from '../ColorPresetPicker';
import { IconPicker } from '../IconPicker';
import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

export const DesignAppearanceSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const isFlyer = formData.card_type === 'flyer';
  const [imgError, setImgError] = useState(false);

  // Reset error when URL changes
  const handleImageUrlChange = (value: string) => {
    setImgError(false);
    onChange('image_url', value);
  };

  if (isFlyer) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <SectionHeader icon={ImageIcon} title="Flyer Image" />

        <div className="space-y-4">
          <div>
            <Label htmlFor="image_url" className="font-semibold">
              Flyer Image URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="/images/my-flyer.png or https://..."
              className="mt-1"
            />
          </div>

          <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-4">
            {formData.image_url && !imgError ? (
              <img
                src={formData.image_url}
                alt="Flyer preview"
                className="mx-auto max-h-64 w-auto rounded-md object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ImageIcon className="mb-2 h-10 w-10" />
                <p className="text-sm">
                  {formData.image_url && imgError
                    ? 'Could not load image — check the URL'
                    : 'Paste an image URL above to preview'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
