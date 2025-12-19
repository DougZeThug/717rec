import React from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Copy, GripVertical } from "lucide-react";
import { HeroCard } from "@/types/heroCard";
import { useHeroCardMutations } from "@/hooks/useHeroCards";
import { HERO_CARD_COLOR_PRESETS, HERO_CARD_TYPES, TARGET_TYPE_OPTIONS } from "@/constants/heroCardPresets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeroCardsListProps {
  cards: HeroCard[];
  isLoading: boolean;
  onEdit: (card: HeroCard) => void;
}

const cardTypeBadgeColors: Record<string, string> = {
  standard: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-700",
  champions: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-700",
  event: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-700",
  announcement: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-700",
};

// Find friendly names
const getCardTypeName = (typeId: string) => {
  return HERO_CARD_TYPES.find(t => t.id === typeId)?.name || typeId;
};

const getTargetTypeName = (targetType: string) => {
  const found = TARGET_TYPE_OPTIONS.find(t => t.id === targetType);
  if (!found || targetType === 'none') return null;
  return found.name;
};

// Find color preset preview
const getColorPreview = (bgColor: string) => {
  const preset = HERO_CARD_COLOR_PRESETS.find(p => p.background_color === bgColor);
  return preset?.preview || 'linear-gradient(to right, #6b7280, #9ca3af)';
};

const getColorPresetName = (bgColor: string) => {
  const preset = HERO_CARD_COLOR_PRESETS.find(p => p.background_color === bgColor);
  return preset?.name || 'Custom colors';
};

const HeroCardsList: React.FC<HeroCardsListProps> = ({ cards, isLoading, onEdit }) => {
  const { toggleVisibility, deleteCard, createCard, isDeleting } = useHeroCardMutations();

  const handleToggleVisibility = async (card: HeroCard) => {
    await toggleVisibility({ id: card.id, is_visible: !card.is_visible });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this card? This cannot be undone.")) {
      await deleteCard(id);
    }
  };

  const handleDuplicate = async (card: HeroCard) => {
    const { id, created_at, updated_at, ...rest } = card;
    await createCard({
      ...rest,
      slug: `${card.slug}-copy`,
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
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No hero cards yet</p>
        <p className="text-sm">Create your first card to get started</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead className="w-14">Theme</TableHead>
              <TableHead>Card Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-36">On Homepage?</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id} className="transition-colors duration-150 hover:bg-muted/50 active:bg-muted">
                <TableCell>
                  <div className="flex items-center gap-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <span className="font-mono text-sm">{card.sort_order}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <div 
                        className="w-8 h-8 rounded-md border shadow-sm"
                        style={{ background: getColorPreview(card.background_color) }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {getColorPresetName(card.background_color)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <div>
                        <div className="font-medium">{card.title}</div>
                        <div className="text-xs text-muted-foreground">{card.slug}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Internal ID: {card.slug}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cardTypeBadgeColors[card.card_type] || ''}
                  >
                    {getCardTypeName(card.card_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getTargetTypeName(card.target_type) ? (
                    <span className="text-sm text-muted-foreground">
                      {getTargetTypeName(card.target_type)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={card.is_visible}
                      onCheckedChange={() => handleToggleVisibility(card)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {card.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileTap={{ scale: 0.9 }}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onEdit(card)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>Edit card</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileTap={{ scale: 0.9 }}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDuplicate(card)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate card</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileTap={{ scale: 0.9 }}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(card.id)}
                            disabled={isDeleting}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>Delete card</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default HeroCardsList;
