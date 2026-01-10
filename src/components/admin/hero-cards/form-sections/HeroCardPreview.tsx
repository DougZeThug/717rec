import { Eye } from 'lucide-react';
import React from 'react';

import HeroCardComponent from '@/components/hero/HeroCard';
import { HeroCard } from '@/types/heroCard';

interface HeroCardPreviewProps {
  card: HeroCard;
}

export const HeroCardPreview: React.FC<HeroCardPreviewProps> = ({ card }) => {
  return (
    <div className="lg:sticky lg:top-4 h-fit">
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Live Preview</h3>
        </div>

        <div className="bg-background rounded-lg p-4 overflow-hidden">
          <HeroCardComponent card={card} />
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          This is how the card will appear on the homepage
        </p>
      </div>
    </div>
  );
};
