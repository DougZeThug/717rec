
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./card";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router";
import { getCardStyle } from "@/styles/design-system";
import { gradients } from "@/styles/design-system";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";

interface AppCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  badge?: string;
  badgeVariant?: "default" | "outline" | "secondary" | "destructive" | "competitive" | "intermediate" | "recreational";
  linkTo?: string;
  division?: string | null;
  isClickable?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  elevation?: "default" | "active" | "highlighted";
  gradient?: "default" | "subtle" | "highlight" | "blueOrange" | "orangeAccent";
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  description,
  className = "",
  children,
  footer,
  badge,
  badgeVariant = "default",
  linkTo,
  division = null,
  isClickable = false,
  isInteractive = true,
  onClick,
  headerClassName = "",
  contentClassName = "",
  footerClassName = "",
  elevation = "default",
  gradient = "default"
}) => {
  const { isDark } = useThemeConsistency();

  const cardContent = (
    <>
      {(title || description || badge) && (
        <CardHeader className={cn(
          "flex flex-row items-start justify-between gap-4",
          badge && cn(
            "bg-gradient-to-br",
            isDark 
              ? "from-gray-800/90 via-gray-800/70 to-gray-900/80" 
              : "from-white via-white to-gray-50"
          ),
          headerClassName
        )}>
          <div>
            {title && (typeof title === "string" ? <CardTitle>{title}</CardTitle> : title)}
            {description && (typeof description === "string" ? <CardDescription>{description}</CardDescription> : description)}
          </div>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </CardHeader>
      )}
      {children && (
        <CardContent className={contentClassName}>
          {children}
        </CardContent>
      )}
      {footer && (
        <CardFooter className={cn(
          "bg-gradient-to-br",
          isDark 
            ? "from-gray-800/30 to-transparent" 
            : "from-gray-50/50 to-transparent",
          footerClassName
        )}>
          {footer}
        </CardFooter>
      )}
    </>
  );

  // Get the correct gradient based on the prop
  let cardGradient = gradient;
  if (gradient === "blueOrange" || gradient === "orangeAccent") {
    cardGradient = "default"; // Will be overridden by the className below
  }

  const cardStyles = cn(
    getCardStyle({
      gradient: cardGradient as "default" | "subtle" | "highlight",
      elevationType: elevation,
      isInteractive,
      division,
      className: cn(
        isClickable && "cursor-pointer w-full text-left",
        gradient === "blueOrange" && gradients.card.blueOrange,
        gradient === "orangeAccent" && gradients.card.orangeAccent,
        className
      )
    })
  );

  // Render different elements based on props
  if (linkTo) {
    return (
      <Link to={linkTo} className={cn("block", cardStyles)}>
        <Card className="h-full border-0">
          {cardContent}
        </Card>
      </Link>
    );
  } else if (isClickable) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

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
    return (
      <Card className={cardStyles}>
        {cardContent}
      </Card>
    );
  }
};

export default AppCard;
