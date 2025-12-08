import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Copy } from "lucide-react";
import { HeroCard } from "@/types/heroCard";
import { useHeroCardMutations } from "@/hooks/useHeroCards";
import { cn } from "@/lib/utils";

interface HeroCardsListProps {
  cards: HeroCard[];
  isLoading: boolean;
  onEdit: (card: HeroCard) => void;
}

const cardTypeBadgeColors: Record<string, string> = {
  standard: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  champions: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  event: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  announcement: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const HeroCardsList: React.FC<HeroCardsListProps> = ({ cards, isLoading, onEdit }) => {
  const { toggleVisibility, deleteCard, createCard, isDeleting } = useHeroCardMutations();

  const handleToggleVisibility = async (card: HeroCard) => {
    await toggleVisibility({ id: card.id, is_visible: !card.is_visible });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this hero card?")) {
      await deleteCard(id);
    }
  };

  const handleDuplicate = async (card: HeroCard) => {
    const { id, created_at, updated_at, ...rest } = card;
    await createCard({
      ...rest,
      slug: `${card.slug}-copy-${Date.now()}`,
      title: `${card.title} (Copy)`,
      is_visible: false
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hero cards yet. Create your first card to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Visible</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cards.map((card) => (
          <TableRow key={card.id}>
            <TableCell className="font-mono text-sm">{card.sort_order}</TableCell>
            <TableCell className="font-medium">{card.title}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{card.slug}</TableCell>
            <TableCell>
              <Badge className={cn("capitalize", cardTypeBadgeColors[card.card_type])}>
                {card.card_type}
              </Badge>
            </TableCell>
            <TableCell>
              <Switch 
                checked={card.is_visible} 
                onCheckedChange={() => handleToggleVisibility(card)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDuplicate(card)}
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEdit(card)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDelete(card.id)}
                  disabled={isDeleting}
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default HeroCardsList;
