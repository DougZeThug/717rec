import { ArrowLeft } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHeroCardMutations } from '@/hooks/useHeroCards';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  HeroCard,
  HeroCardFormData,
  HeroCardMetadata,
  HeroCardTargetType,
  HeroCardType,
} from '@/types/heroCard';
import { tryParseHeroCardMetadata } from '@/utils/parseMetadata';

import {
  AdvancedSettingsSection,
  CallToActionSection,
  CardBasicsSection,
  ChampionsEditor,
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

/** The values the form opens with, for a card being edited or a new one. */
const buildFormData = (card: HeroCard | null): HeroCardFormData =>
  card
    ? {
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
      }
    : defaultFormData;

/**
 * What the live preview shows: the typed values, with placeholders for blanks.
 *
 * `metadata` is passed in rather than parsed here. This runs on every render,
 * including the one after each keystroke in the "Extra Data (JSON)" box, and
 * parsing that box can fail — a throw in here escapes render and takes the whole
 * admin dashboard down with it.
 */
const buildPreviewCard = (
  card: HeroCard | null,
  formData: HeroCardFormData,
  metadata: HeroCardMetadata
): HeroCard => ({
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
  metadata,
  created_at: card?.created_at || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const HeroCardForm: React.FC<HeroCardFormProps> = ({ card, onClose }) => {
  const { createCard, updateCard, isCreating, isUpdating } = useHeroCardMutations();
  // The form is keyed on the card id by its parent, so a different card mounts a
  // fresh form; the opening values never need to change under it.
  const [initialFormData] = useState<HeroCardFormData>(() => buildFormData(card));
  const [formData, setFormData] = useState<HeroCardFormData>(initialFormData);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Parsed once for the whole form: the preview, both metadata editors and the
  // save all need the same answer, and none of them may throw for it.
  const metadataResult = useMemo(
    () => tryParseHeroCardMetadata(formData.metadata, formData.card_type),
    [formData.metadata, formData.card_type]
  );
  const metadataError = metadataResult.ok ? null : metadataResult.error;

  // Closing the form throws the work away — the list replaces it and nothing is
  // kept. `isSaving` stops the guard firing on the close that follows a save.
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = !isSaving && JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const { confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'This hero card is not saved. Leave and lose the changes?'
  );

  const handleClose = () => {
    if (confirmDiscard()) onClose();
  };

  const handleChange = <K extends keyof HeroCardFormData>(field: K, value: HeroCardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metadataResult.ok) {
      // Refused rather than saved as an empty object: writing {} here would drop
      // whatever the card already held. Open the section so the message under
      // the box is on screen, since it is collapsed by default.
      setAdvancedOpen(true);
      return;
    }
    const metadata = metadataResult.metadata;

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

    setIsSaving(true);
    try {
      if (card) {
        await updateCard({ id: card.id, ...payload });
      } else {
        await createCard(payload);
      }
    } catch {
      // The mutation has already raised its own error toast, so there is
      // nothing to add and nothing above this to catch a rethrow. Keep the form
      // open with the work intact, and guarded again.
      setIsSaving(false);
      return;
    }
    onClose();
  };

  // A card whose extra data is wrong still previews, on the last shape that
  // parsed — an empty one. The message under the box is what says why.
  const previewCard = buildPreviewCard(
    card,
    formData,
    metadataResult.ok ? metadataResult.metadata : {}
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleClose}>
          <ArrowLeft className="size-4 mr-2" />
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
            {formData.card_type === 'champions' && (
              <ChampionsEditor
                formData={formData}
                onChange={handleChange}
                metadataError={metadataError}
              />
            )}
            {formData.card_type === 'event' && (
              <EventWinnersEditor
                formData={formData}
                onChange={handleChange}
                metadataError={metadataError}
              />
            )}
            <AdvancedSettingsSection
              formData={formData}
              onChange={handleChange}
              metadataError={metadataError}
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
          disabled={metadataError !== null}
          onCancel={handleClose}
        />
      </form>
    </div>
  );
};

export default HeroCardForm;
