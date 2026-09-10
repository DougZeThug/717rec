import { m } from 'framer-motion';
import { Copy, Edit, GripVertical, Loader2, type LucideIcon, Trash2 } from 'lucide-react';
import React, { forwardRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  HERO_CARD_COLOR_PRESETS,
  HERO_CARD_TYPES,
  TARGET_TYPE_OPTIONS,
} from '@/constants/heroCardPresets';
import { useHeroCardMutations } from '@/hooks/useHeroCards';
import { HeroCard } from '@/types/heroCard';

interface HeroCardsListProps {
  cards: HeroCard[];
  isLoading: boolean;
  onEdit: (card: HeroCard) => void;
}

const cardTypeBadgeColors: Record<string, string> = {
  standard: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-700',
  champions: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-700',
  event: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-700',
  announcement: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-700',
};

interface HeroCardActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The animated button on its own, forwarding a ref so Radix's `asChild`
 * trigger can reach the DOM node it needs to position against.
 */
const AnimatedIconButton = forwardRef<HTMLDivElement, HeroCardActionProps>(
  ({ icon: Icon, label, onClick, disabled, className, ...triggerProps }, ref) => (
    <m.div ref={ref} whileTap={{ scale: 0.9 }} {...triggerProps}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        className={className}
        aria-label={label}
      >
        <Icon className="size-4" />
      </Button>
    </m.div>
  )
);
AnimatedIconButton.displayName = 'AnimatedIconButton';

/** One row action. The label names the button and captions its tooltip. */
const HeroCardAction: React.FC<HeroCardActionProps> = (props) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <AnimatedIconButton {...props} />
    </TooltipTrigger>
    <TooltipContent>{props.label}</TooltipContent>
  </Tooltip>
);

// Find friendly names
const getCardTypeName = (typeId: string) => {
  return HERO_CARD_TYPES.find((t) => t.id === typeId)?.name || typeId;
};

const getTargetTypeName = (targetType: string) => {
  const found = TARGET_TYPE_OPTIONS.find((t) => t.id === targetType);
  if (!found || targetType === 'none') return null;
  return found.name;
};

// Find color preset preview
const getColorPreview = (bgColor: string) => {
  const preset = HERO_CARD_COLOR_PRESETS.find((p) => p.background_color === bgColor);
  return preset?.preview || 'linear-gradient(to right, #6b7280, #9ca3af)';
};

const getColorPresetName = (bgColor: string) => {
  const preset = HERO_CARD_COLOR_PRESETS.find((p) => p.background_color === bgColor);
  return preset?.name || 'Custom colors';
};

const HeroCardsList: React.FC<HeroCardsListProps> = ({ cards, isLoading, onEdit }) => {
  const { toggleVisibility, deleteCard, createCard, isCreating, isDeleting } =
    useHeroCardMutations();
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const cardToDelete = deletingCardId ? cards.find((c) => c.id === deletingCardId) : null;

  const handleToggleVisibility = async (card: HeroCard) => {
    await toggleVisibility({ id: card.id, is_visible: !card.is_visible });
  };

  const handleConfirmDelete = async () => {
    if (!deletingCardId) return;
    await deleteCard(deletingCardId);
    setDeletingCardId(null);
  };

  /**
   * hero_cards.slug is UNIQUE, so a fixed "-copy" suffix means duplicating the
   * same card a second time is refused by the database. Walk to the first free
   * suffix instead. `cards` is the full admin list, so no extra query is needed.
   */
  const nextFreeCopy = (slug: string, title: string) => {
    const taken = new Set(cards.map((c) => c.slug));
    if (!taken.has(`${slug}-copy`)) return { slug: `${slug}-copy`, title: `${title} (Copy)` };
    let n = 2;
    while (taken.has(`${slug}-copy-${n}`)) n += 1;
    return { slug: `${slug}-copy-${n}`, title: `${title} (Copy ${n})` };
  };

  const handleDuplicate = async (card: HeroCard) => {
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = card;
    const copy = nextFreeCopy(card.slug, card.title);
    try {
      await createCard({ ...rest, ...copy, is_visible: false });
    } catch {
      // createCard is mutateAsync, so it rejects. The hook already toasts;
      // without this the rejection is unhandled on top of that toast.
    }
  };

  // Rebuilt each render: the cells close over handlers that are themselves new
  // each render, so memoising would need every one of them wrapped first and
  // would save nothing — `ResponsiveTable` is not memoised.
  const columns: ResponsiveTableColumn<HeroCard>[] = [
    {
      id: 'order',
      header: 'Order',
      className: 'w-16',
      cell: (card) => (
        <div className="flex items-center gap-1">
          <GripVertical className="size-4 text-muted-foreground/50" />
          <span className="font-mono text-sm">{card.sort_order}</span>
        </div>
      ),
    },
    {
      id: 'theme',
      header: 'Theme',
      className: 'w-14',
      cell: (card) => (
        <Tooltip>
          <TooltipTrigger>
            <div
              className="size-8 rounded-md border shadow-sm"
              style={{ background: getColorPreview(card.background_color) }}
            />
          </TooltipTrigger>
          <TooltipContent>{getColorPresetName(card.background_color)}</TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: 'name',
      header: 'Card Name',
      card: 'title',
      cell: (card) => (
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
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: (card) => (
        <Badge variant="outline" className={cardTypeBadgeColors[card.card_type] || ''}>
          {getCardTypeName(card.card_type)}
        </Badge>
      ),
    },
    {
      id: 'target',
      header: 'Target',
      cell: (card) =>
        getTargetTypeName(card.target_type) ? (
          <span className="text-sm text-muted-foreground">
            {getTargetTypeName(card.target_type)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        ),
    },
    {
      id: 'visible',
      header: 'On Homepage?',
      className: 'w-36',
      cell: (card) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={card.is_visible}
            onCheckedChange={() => handleToggleVisibility(card)}
            aria-label={`Show ${card.title} on the homepage`}
          />
          <span className="text-xs text-muted-foreground">
            {card.is_visible ? 'Visible' : 'Hidden'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      card: 'actions',
      align: 'right',
      cell: (card) => (
        <div className="flex justify-end gap-1">
          <HeroCardAction icon={Edit} label="Edit card" onClick={() => onEdit(card)} />
          <HeroCardAction
            icon={Copy}
            label="Duplicate card"
            onClick={() => handleDuplicate(card)}
            disabled={isCreating}
          />
          <HeroCardAction
            icon={Trash2}
            label="Delete card"
            onClick={() => setDeletingCardId(card.id)}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          />
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {['hero-skel-1', 'hero-skel-2', 'hero-skel-3'].map((sk) => (
          <Skeleton key={sk} className="h-16 w-full" />
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
      <ResponsiveTable
        caption="Hero cards on the home page"
        columns={columns}
        rows={cards}
        rowKey={(card) => card.id}
      />

      <AlertDialog
        open={!!deletingCardId}
        onOpenChange={(open) => !open && setDeletingCardId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hero Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{cardToDelete?.title}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default HeroCardsList;
