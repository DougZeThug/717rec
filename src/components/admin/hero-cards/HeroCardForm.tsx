import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHeroCardMutations } from '@/hooks/useHeroCards';
import { HeroCard, HeroCardFormData, HeroCardTargetType, HeroCardType } from '@/types/heroCard';

import {
  AdvancedSettingsSection,
  CallToActionSection,
  CardBasicsSection,
  DesignAppearanceSection,
  EventWinnersEditor,
  FormActions,
  HeroCardPreview,
  TargetingDisplaySection,
} from './form-sections';

interface HeroCardFormProps {
  card: HeroCard | null;
  onClose: () => void;
}

const defaultFormData: HeroCardFormData = {
  slug: '',
  title: '',
  subtitle: '',
  body: '',
  cta_label: '',
  cta_url: '',
  background_color: 'bg-gradient-to-r from-blue-600 to-amber-500',
  text_color: 'text-white',
  accent_color: '',
  image_url: '',
  icon_name: '',
  is_visible: false,
  sort_order: 0,
  target_type: 'none' as HeroCardTargetType,
  target_id: '',
  card_type: 'standard' as HeroCardType,
  metadata: '{}',
};

const HeroCardForm: React.FC<HeroCardFormProps> = ({ card, onClose }) => {
  const { createCard, updateCard, isCreating, isUpdating } = useHeroCardMutations();
  const [formData, setFormData] = useState<HeroCardFormData>(defaultFormData);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        slug: card.slug,
        title: card.title,
        subtitle: card.subtitle || '',
        body: card.body || '',
        cta_label: card.cta_label || '',
        cta_url: card.cta_url || '',
        background_color: card.background_color,
        text_color: card.text_color,
        accent_color: card.accent_color || '',
        image_url: card.image_url || '',
        icon_name: card.icon_name || '',
        is_visible: card.is_visible,
        sort_order: card.sort_order,
        target_type: card.target_type,
        target_id: card.target_id || '',
        card_type: card.card_type,
        metadata: JSON.stringify(card.metadata, null, 2),
      });
    }
  }, [card]);

  const handleChange = (field: keyof HeroCardFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let metadata = {};
    try {
      metadata = JSON.parse(formData.metadata);
    } catch {
      metadata = {};
    }

    const payload = {
      slug: formData.slug,
      title: formData.title,
      subtitle: formData.subtitle || null,
      body: formData.body || null,
      cta_label: formData.cta_label || null,
      cta_url: formData.cta_url || null,
      background_color: formData.background_color,
      text_color: formData.text_color,
      accent_color: formData.accent_color || null,
      image_url: formData.image_url || null,
      icon_name: formData.icon_name || null,
      is_visible: formData.is_visible,
      sort_order: formData.sort_order,
      target_type: formData.target_type,
      target_id: formData.target_id || null,
      card_type: formData.card_type,
      metadata,
    };

    if (card) {
      await updateCard({ id: card.id, ...payload });
    } else {
      await createCard(payload);
    }
    onClose();
  };

  // Build preview card object
  let previewMetadata = {};
  try {
    previewMetadata = JSON.parse(formData.metadata);
  } catch {
    previewMetadata = {};
  }

  const previewCard: HeroCard = {
    id: card?.id || 'preview',
    slug: formData.slug || 'preview',
    title: formData.title || 'Card Headline',
    subtitle: formData.subtitle || null,
    body: formData.body || null,
    cta_label: formData.cta_label || null,
    cta_url: formData.cta_url || null,
    background_color: formData.background_color,
    text_color: formData.text_color,
    accent_color: formData.accent_color || null,
    image_url: formData.image_url || null,
    icon_name: formData.icon_name || null,
    is_visible: formData.is_visible,
    sort_order: formData.sort_order,
    target_type: formData.target_type,
    target_id: formData.target_id || null,
    card_type: formData.card_type,
    metadata: previewMetadata,
    created_at: card?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">{card ? 'Edit Hero Card' : 'Create Hero Card'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            <CardBasicsSection formData={formData} onChange={handleChange} />
            <CallToActionSection formData={formData} onChange={handleChange} />
            <DesignAppearanceSection formData={formData} onChange={handleChange} />
            <TargetingDisplaySection formData={formData} onChange={handleChange} />
            {formData.card_type === 'event' && (
              <EventWinnersEditor formData={formData} onChange={handleChange} />
            )}
            <AdvancedSettingsSection
              formData={formData}
              onChange={handleChange}
              isOpen={advancedOpen}
              onOpenChange={setAdvancedOpen}
            />
          </div>

          {/* Right Column - Live Preview */}
          <HeroCardPreview card={previewCard} />
        </div>

        <FormActions
          isSubmitting={isCreating || isUpdating}
          isEditing={!!card}
          onCancel={onClose}
        />
      </form>
    </div>
  );
};

export default HeroCardForm;
