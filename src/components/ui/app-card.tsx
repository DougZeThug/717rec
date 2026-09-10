import React, { useCallback } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { getCardStyle, gradients } from '@/styles/design-system';

import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

interface AppCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  badge?: string;
  badgeVariant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'destructive'
    | 'competitive'
    | 'intermediate'
    | 'recreational';
  linkTo?: string;
  division?: string | null;
  isClickable?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  elevation?: 'default' | 'active' | 'highlighted';
  gradient?: 'default' | 'subtle' | 'highlight' | 'blueOrange' | 'orangeAccent';
}

/** Themed card that renders as a link, keyboard-activatable button, or static container. */
export const AppCard: React.FC<AppCardProps> = ({
  title,
  description,
  className = '',
  children,
  footer,
  badge,
  badgeVariant = 'default',
  linkTo,
  division = null,
  isClickable = false,
  isInteractive = true,
  onClick,
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  elevation = 'default',
  gradient = 'default',
}) => {
  /** Shared header/body/footer markup reused by all three card render variants below. */
  const cardContent = (
    <>
      {(title || description || badge) && (
        <CardHeader
          className={cn(
            'flex flex-row items-start justify-between gap-4',
            // A faint wash behind a badged header. It was a light/dark pair of
            // hand-written greys, which drew the light wash on the dark winter
            // page; `--muted` is the same wash in every theme.
            badge && 'bg-muted/30',
            headerClassName
          )}
        >
          <div>
            {title && (typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title)}
            {description &&
              (typeof description === 'string' ? (
                <CardDescription>{description}</CardDescription>
              ) : (
                description
              ))}
          </div>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </CardHeader>
      )}
      {children && <CardContent className={contentClassName}>{children}</CardContent>}
      {footer && <CardFooter className={cn('bg-muted/20', footerClassName)}>{footer}</CardFooter>}
    </>
  );

  // Get the correct gradient based on the prop
  let cardGradient = gradient;
  if (gradient === 'blueOrange' || gradient === 'orangeAccent') {
    cardGradient = 'default'; // Will be overridden by the className below
  }

  const cardStyles = cn(
    getCardStyle({
      gradient: cardGradient as 'default' | 'subtle' | 'highlight',
      elevationType: elevation,
      isInteractive,
      division,
      className: cn(
        isClickable && 'cursor-pointer w-full text-left',
        gradient === 'blueOrange' && gradients.card.blueOrange,
        gradient === 'orangeAccent' && gradients.card.orangeAccent,
        className
      ),
    })
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  // Render different elements based on props
  if (linkTo) {
    return (
      <Link to={linkTo} className={cn('block', cardStyles)}>
        <Card className="h-full border-0">{cardContent}</Card>
      </Link>
    );
  } else if (isClickable) {
    return (
      <Card
        className={cardStyles}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {cardContent}
      </Card>
    );
  } else {
    return <Card className={cardStyles}>{cardContent}</Card>;
  }
};
