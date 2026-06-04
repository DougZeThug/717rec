import { Image, Plus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllHeroCards } from '@/hooks/useHeroCards';
import { HeroCard } from '@/types/heroCard';

import ChallongeFallbackSection from '../challonge-fallback/ChallongeFallbackSection';
import HeroCardForm from './HeroCardForm';
import HeroCardsList from './HeroCardsList';

const HeroCardsTab: React.FC = () => {
  const { data: heroCards, isLoading } = useAllHeroCards();
  const [editingCard, setEditingCard] = useState<HeroCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (card: HeroCard) => {
    setEditingCard(card);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingCard(null);
    setIsCreating(true);
  };

  const handleClose = () => {
    setEditingCard(null);
    setIsCreating(false);
  };

  if (isCreating || editingCard) {
    return <HeroCardForm key={editingCard?.id ?? 'new'} card={editingCard} onClose={handleClose} />;
  }

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Image className="size-5" />
          Hero Cards
        </CardTitle>
        <Button onClick={handleCreate} size="sm">
          <Plus className="size-4 mr-2" />
          Create Card
        </Button>
      </CardHeader>
      <CardContent>
        <HeroCardsList cards={heroCards || []} isLoading={isLoading} onEdit={handleEdit} />
      </CardContent>
      </Card>
      <ChallongeFallbackSection />
    </div>
  );
};

export default HeroCardsTab;
