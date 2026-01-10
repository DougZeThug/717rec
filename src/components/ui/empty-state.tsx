import { motion } from 'framer-motion';
import { ExternalLink, LucideIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

interface SecondaryLink {
  label: string;
  href: string;
  external?: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  secondaryLink?: SecondaryLink;
  className?: string;
  iconClassName?: string;
}

/**
 * Reusable illustrated empty state component with animated entrance
 * Provides consistent empty states across the app with actionable CTAs
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actions = [],
  secondaryLink,
  className,
  iconClassName,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}
    >
      {/* Animated icon container with subtle pulse */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative mb-6"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />

        {/* Icon circle */}
        <div
          className={cn(
            'relative flex items-center justify-center w-20 h-20 rounded-full',
            'bg-muted/50 border border-border/50',
            iconClassName
          )}
        >
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-xl font-bebas tracking-wide text-foreground mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="text-muted-foreground max-w-sm mb-6 font-inter"
      >
        {description}
      </motion.p>

      {/* Action buttons */}
      {actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || 'default'}
                onClick={action.onClick}
                className="min-w-[120px]"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
                {action.label}
              </Button>
            );
          })}
        </motion.div>
      )}

      {/* Secondary link */}
      {secondaryLink && (
        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          href={secondaryLink.href}
          target={secondaryLink.external ? '_blank' : undefined}
          rel={secondaryLink.external ? 'noopener noreferrer' : undefined}
          className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
        >
          {secondaryLink.label}
          {secondaryLink.external && <ExternalLink className="w-3 h-3" />}
        </motion.a>
      )}
    </motion.div>
  );
};

export { EmptyState };
export type { EmptyStateAction, EmptyStateProps, SecondaryLink };
