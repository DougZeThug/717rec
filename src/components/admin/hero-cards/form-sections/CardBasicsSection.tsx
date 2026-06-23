import { Type } from 'lucide-react';
import React, { useCallback } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HERO_CARD_TYPES } from '@/constants/heroCardPresets';
import { cn } from '@/lib/utils';
import { HeroCardType } from '@/types/heroCard';

import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

interface CardTypeButtonProps {
  type: (typeof HERO_CARD_TYPES)[number];
  isSelected: boolean;
  onSelect: (cardType: HeroCardType) => void;
}

const CardTypeButton: React.FC<CardTypeButtonProps> = ({ type, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(type.id as HeroCardType);
  }, [onSelect, type.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'p-3 rounded-lg border-2 text-left transition-all',
        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
      )}
    >
      <span className="font-medium text-sm">{type.name}</span>
      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
    </button>
  );
};

export const CardBasicsSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const handleSlugChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange('slug', event.target.value);
    },
    [onChange]
  );

  const handleCardTypeChange = useCallback(
    (cardType: HeroCardType) => {
      onChange('card_type', cardType);
    },
    [onChange]
  );

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange('title', event.target.value);
    },
    [onChange]
  );

  const handleSubtitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange('subtitle', event.target.value);
    },
    [onChange]
  );

  const handleBodyChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange('body', event.target.value);
    },
    [onChange]
  );

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Type} title="Card Basics" />

      <div className="space-y-4">
        <div>
          <Label htmlFor="slug">Card Name (for admins)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={handleSlugChange}
            placeholder="e.g., fall-2025-announcement"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Internal reference only, not shown to players
          </p>
        </div>

        <div>
          <Label>Card Type</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {HERO_CARD_TYPES.map((type) => (
              <CardTypeButton
                key={type.id}
                type={type}
                isSelected={formData.card_type === type.id}
                onSelect={handleCardTypeChange}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="title">Headline</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={handleTitleChange}
            placeholder="The main text players will see"
            required
          />
        </div>

        <div>
          <Label htmlFor="subtitle">Subheadline (optional)</Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={handleSubtitleChange}
            placeholder="Secondary text beneath the headline"
          />
        </div>

        <div>
          <Label htmlFor="body">Description (optional)</Label>
          <Textarea
            id="body"
            value={formData.body}
            onChange={handleBodyChange}
            placeholder="Additional details shown on some card types"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
