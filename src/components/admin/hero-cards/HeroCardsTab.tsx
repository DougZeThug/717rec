import { Image, Plus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllHeroCards } from '@/hooks/useHeroCards';
import { HeroCard } from '@/types/heroCard';

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
    return <HeroCardForm card={editingCard} onClose={handleClose} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Hero Cards
        </CardTitle>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Card
        </Button>
      </CardHeader>
      <CardContent>
        <HeroCardsList cards={heroCards || []} isLoading={isLoading} onEdit={handleEdit} />
      </CardContent>
    </Card>
  );
};

export default HeroCardsTab;
