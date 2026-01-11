import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { cn } from '@/lib/utils';
import { cardAnimations, cardGradients } from '@/styles/design-system/cards';

export interface SummaryCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  title: string;
  value: React.ReactNode;
  description?: string;
  gradient?: keyof typeof cardGradients;
  index?: number;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  iconColor,
  iconBgColor,
  title,
  value,
  description,
  gradient = 'default',
  index = 0,
  className,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const gradientClass = isLight
    ? cardGradients[gradient] || cardGradients.default
    : 'bg-card border-border';

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardAnimations.stagger}
      className={cn('p-4 rounded-xl border shadow-sm', gradientClass, className)}
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center justify-center rounded-full w-10 h-10', iconBgColor)}>
          <Icon size={22} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="uppercase tracking-wide text-xs font-medium text-muted-foreground font-inter">
            {title}
          </h3>
          <p className="font-mono text-lg font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground font-medium truncate" title={description}>
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SummaryCard;
