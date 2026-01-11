import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { HERO_ICON_MAP } from '@/constants/heroCardPresets';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { HeroCard } from '@/types/heroCard';

interface StandardHeroCardProps {
  card: HeroCard;
}

const StandardHeroCard: React.FC<StandardHeroCardProps> = ({ card }) => {
  const Icon = card.icon_name ? HERO_ICON_MAP[card.icon_name] : null;
  const { shouldApplyWinter } = useSeasonalTheme();

  const content = (
    <div className="relative flex items-center justify-center gap-3 px-6 py-4">
      {Icon && <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />}
      <span className="font-bebas uppercase tracking-wide text-lg">{card.title}</span>
      {card.cta_url && (
        <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
      )}
    </div>
  );

  const baseClasses = cn(
    'group relative block w-full',
    'transition-all duration-200',
    'rounded-xl shadow-md hover:shadow-lg',
    'border border-border/30',
    shouldApplyWinter
      ? cn('winter-card-full overflow-visible', 'text-cyan-50')
      : cn(
          'overflow-hidden',
          card.background_color,
          card.text_color,
          'border-t-[3px] border-t-blue-500 dark:border-t-blue-400'
        )
  );

  const cardWrapper = (children: React.ReactNode) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );

  if (card.cta_url) {
    if (card.cta_url.startsWith('http')) {
      return cardWrapper(
        <a href={card.cta_url} target="_blank" rel="noopener noreferrer" className={baseClasses}>
          <div
            className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              shouldApplyWinter
                ? 'bg-gradient-to-r from-cyan-500/10 to-transparent'
                : 'bg-gradient-to-r from-white/10 to-transparent'
            )}
          />
          {content}
        </a>
      );
    }

    return cardWrapper(
      <Link to={card.cta_url} className={baseClasses}>
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            shouldApplyWinter
              ? 'bg-gradient-to-r from-cyan-500/10 to-transparent'
              : 'bg-gradient-to-r from-white/10 to-transparent'
          )}
        />
        {content}
      </Link>
    );
  }

  return cardWrapper(
    <div className={baseClasses}>
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          shouldApplyWinter
            ? 'bg-gradient-to-r from-cyan-500/10 to-transparent'
            : 'bg-gradient-to-r from-white/10 to-transparent'
        )}
      />
      {content}
    </div>
  );
};

export default StandardHeroCard;
