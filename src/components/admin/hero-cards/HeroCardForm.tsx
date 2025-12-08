import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { HeroCard, HeroCardType, HeroCardTargetType } from "@/types/heroCard";
import { useHeroCardMutations } from "@/hooks/useHeroCards";
import HeroCardComponent from "@/components/hero/HeroCard";
import TargetSelector from "./TargetSelector";

interface HeroCardFormProps {
  card: HeroCard | null;
  onClose: () => void;
}

const defaultFormData = {
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
  const [formData, setFormData] = useState(defaultFormData);

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

  const handleChange = (field: string, value: any) => {
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
    slug: formData.slug,
    title: formData.title || "Preview Title",
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Card Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (unique ID)</Label>
                  <Input 
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder="blind-draw-dec"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_type">Card Type</Label>
                  <Select value={formData.card_type} onValueChange={(v) => handleChange('card_type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="champions">Champions</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Blind Draw"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input 
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => handleChange('subtitle', e.target.value)}
                  placeholder="Thursday, December 11th"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea 
                  id="body"
                  value={formData.body}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder="Description text..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cta_label">CTA Label</Label>
                  <Input 
                    id="cta_label"
                    value={formData.cta_label}
                    onChange={(e) => handleChange('cta_label', e.target.value)}
                    placeholder="View Details"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_url">CTA URL</Label>
                  <Input 
                    id="cta_url"
                    value={formData.cta_url}
                    onChange={(e) => handleChange('cta_url', e.target.value)}
                    placeholder="/history"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="background_color">Background Color (Tailwind)</Label>
                  <Input 
                    id="background_color"
                    value={formData.background_color}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    placeholder="bg-gradient-to-r from-blue-600 to-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text_color">Text Color (Tailwind)</Label>
                  <Input 
                    id="text_color"
                    value={formData.text_color}
                    onChange={(e) => handleChange('text_color', e.target.value)}
                    placeholder="text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon_name">Icon Name</Label>
                  <Select value={formData.icon_name} onValueChange={(v) => handleChange('icon_name', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trophy">Trophy</SelectItem>
                      <SelectItem value="Shuffle">Shuffle</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Calendar">Calendar</SelectItem>
                      <SelectItem value="Star">Star</SelectItem>
                      <SelectItem value="Sparkles">Sparkles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input 
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_type">Target Type</Label>
                  <Select value={formData.target_type} onValueChange={(v) => handleChange('target_type', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="division">Division</SelectItem>
                      <SelectItem value="season">Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.target_type !== 'none' && (
                  <TargetSelector 
                    targetType={formData.target_type}
                    value={formData.target_id}
                    onChange={(v) => handleChange('target_id', v)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea 
                  id="metadata"
                  value={formData.metadata}
                  onChange={(e) => handleChange('metadata', e.target.value)}
                  placeholder="{}"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch 
                  id="is_visible"
                  checked={formData.is_visible}
                  onCheckedChange={(v) => handleChange('is_visible', v)}
                />
                <Label htmlFor="is_visible">Visible on Homepage</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isCreating || isUpdating}>
                  <Save className="h-4 w-4 mr-2" />
                  {card ? "Save Changes" : "Create Card"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <HeroCardComponent card={previewCard} />
              <p className="text-xs text-muted-foreground text-center">
                This is how your card will appear on the homepage
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeroCardForm;
