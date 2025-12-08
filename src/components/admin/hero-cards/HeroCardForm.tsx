import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ChevronDown, Settings, Eye, Palette, MousePointer, Type, Target } from "lucide-react";
import { HeroCard, HeroCardType, HeroCardTargetType, HeroCardFormData } from "@/types/heroCard";
import { useHeroCardMutations } from "@/hooks/useHeroCards";
import HeroCardComponent from "@/components/hero/HeroCard";
import { TargetTypeSelector, TargetEntitySelector } from "./TargetSelector";
import { ColorPresetPicker } from "./ColorPresetPicker";
import { IconPicker } from "./IconPicker";
import { HERO_CARD_TYPES } from "@/constants/heroCardPresets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface HeroCardFormProps {
  card: HeroCard | null;
  onClose: () => void;
}

const defaultFormData: HeroCardFormData = {
  slug: "",
  title: "",
  subtitle: "",
  body: "",
  cta_label: "",
  cta_url: "",
  background_color: "bg-gradient-to-r from-blue-600 to-amber-500",
  text_color: "text-white",
  accent_color: "",
  image_url: "",
  icon_name: "",
  is_visible: false,
  sort_order: 0,
  target_type: "none" as HeroCardTargetType,
  target_id: "",
  card_type: "standard" as HeroCardType,
  metadata: "{}"
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
        subtitle: card.subtitle || "",
        body: card.body || "",
        cta_label: card.cta_label || "",
        cta_url: card.cta_url || "",
        background_color: card.background_color,
        text_color: card.text_color,
        accent_color: card.accent_color || "",
        image_url: card.image_url || "",
        icon_name: card.icon_name || "",
        is_visible: card.is_visible,
        sort_order: card.sort_order,
        target_type: card.target_type,
        target_id: card.target_id || "",
        card_type: card.card_type,
        metadata: JSON.stringify(card.metadata, null, 2)
      });
    }
  }, [card]);

  const handleChange = (field: keyof HeroCardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      metadata
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
    id: card?.id || "preview",
    slug: formData.slug || "preview",
    title: formData.title || "Card Headline",
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
    updated_at: new Date().toISOString()
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">
          {card ? "Edit Hero Card" : "Create Hero Card"}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Section 1: Card Basics */}
            <div className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Type} title="Card Basics" />
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="slug">Card Name (for admins)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
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
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleChange('card_type', type.id as HeroCardType)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          formData.card_type === type.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-medium text-sm">{type.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Headline</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="The main text players will see"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subtitle">Subheadline (optional)</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => handleChange('subtitle', e.target.value)}
                    placeholder="Secondary text beneath the headline"
                  />
                </div>

                <div>
                  <Label htmlFor="body">Description (optional)</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => handleChange('body', e.target.value)}
                    placeholder="Additional details shown on some card types"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Call to Action */}
            <div className="bg-card rounded-lg border p-4">
              <SectionHeader icon={MousePointer} title="Call to Action" />
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cta_label">Button Text</Label>
                  <Input
                    id="cta_label"
                    value={formData.cta_label}
                    onChange={(e) => handleChange('cta_label', e.target.value)}
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
                    onChange={(e) => handleChange('cta_url', e.target.value)}
                    placeholder="e.g., /schedule or https://..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Where should clicking the button take players?
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Design & Appearance */}
            <div className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Palette} title="Design & Appearance" />
              
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Color Theme</Label>
                  <ColorPresetPicker
                    backgroundValue={formData.background_color}
                    textValue={formData.text_color}
                    onSelect={(bg, text) => {
                      handleChange('background_color', bg);
                      handleChange('text_color', text);
                    }}
                  />
                </div>

                <div>
                  <Label className="mb-3 block">Icon</Label>
                  <IconPicker
                    value={formData.icon_name}
                    onChange={(iconId) => handleChange('icon_name', iconId)}
                  />
                </div>

                <div>
                  <Label htmlFor="image_url">Background Image URL (optional)</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Targeting & Display */}
            <div className="bg-card rounded-lg border p-4">
              <SectionHeader icon={Target} title="Targeting & Display" />
              
              <div className="space-y-4">
                <TargetTypeSelector
                  value={formData.target_type}
                  onChange={(v) => {
                    handleChange('target_type', v);
                    if (v === 'none') handleChange('target_id', '');
                  }}
                />

                <TargetEntitySelector
                  targetType={formData.target_type}
                  value={formData.target_id}
                  onChange={(v) => handleChange('target_id', v)}
                />

                <div>
                  <Label htmlFor="sort_order">Display Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
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
                    onCheckedChange={(checked) => handleChange('is_visible', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Advanced Settings (Collapsible) */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full bg-muted/50 rounded-lg border p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Advanced Settings</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    advancedOpen && "rotate-180"
                  )} />
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
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      placeholder="bg-gradient-to-r from-blue-600 to-amber-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="text_color_raw">Custom Text Color (Tailwind)</Label>
                    <Input
                      id="text_color_raw"
                      value={formData.text_color}
                      onChange={(e) => handleChange('text_color', e.target.value)}
                      placeholder="text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="accent_color">Accent Color (Tailwind)</Label>
                    <Input
                      id="accent_color"
                      value={formData.accent_color}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      placeholder="text-amber-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon_name_raw">Icon Name (raw)</Label>
                    <Input
                      id="icon_name_raw"
                      value={formData.icon_name}
                      onChange={(e) => handleChange('icon_name', e.target.value)}
                      placeholder="Trophy, Star, Calendar, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="metadata">Extra Data (JSON)</Label>
                    <Textarea
                      id="metadata"
                      value={formData.metadata}
                      onChange={(e) => handleChange('metadata', e.target.value)}
                      placeholder="{}"
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:sticky lg:top-4 h-fit">
            <div className="bg-muted/30 rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Live Preview</h3>
              </div>
              
              <div className="bg-background rounded-lg p-4 overflow-hidden">
                <HeroCardComponent card={previewCard} />
              </div>
              
              <p className="text-xs text-muted-foreground mt-3 text-center">
                This is how the card will appear on the homepage
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating || isUpdating}>
            {isCreating || isUpdating ? 'Saving...' : card ? 'Save Changes' : 'Create Card'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HeroCardForm;
