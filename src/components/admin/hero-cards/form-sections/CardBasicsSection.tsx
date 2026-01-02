import React from "react";
import { Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HERO_CARD_TYPES } from "@/constants/heroCardPresets";
import { HeroCardType } from "@/types/heroCard";
import { FormSectionProps } from "./types";
import { SectionHeader } from "./SectionHeader";

export const CardBasicsSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Type} title="Card Basics" />
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="slug">Card Name (for admins)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => onChange('slug', e.target.value)}
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
                onClick={() => onChange('card_type', type.id as HeroCardType)}
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
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="The main text players will see"
            required
          />
        </div>

        <div>
          <Label htmlFor="subtitle">Subheadline (optional)</Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="Secondary text beneath the headline"
          />
        </div>

        <div>
          <Label htmlFor="body">Description (optional)</Label>
          <Textarea
            id="body"
            value={formData.body}
            onChange={(e) => onChange('body', e.target.value)}
            placeholder="Additional details shown on some card types"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
