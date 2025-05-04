
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./card";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getCardStyle } from "@/styles/designSystem";

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
  gradient?: "default" | "subtle" | "highlight";
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
  const CardComponent = linkTo ? Link : isClickable ? "button" : "div";
  const cardProps = linkTo ? { to: linkTo } : isClickable ? { onClick } : {};
  
  const cardContent = (
    <>
      {(title || description || badge) && (
        <CardHeader className={cn("flex flex-row items-start justify-between gap-4", headerClassName)}>
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
        <CardFooter className={footerClassName}>
          {footer}
        </CardFooter>
      )}
    </>
  );

  return (
    <Card 
      className={cn(
        getCardStyle({
          gradient,
          elevationType: elevation,
          isInteractive,
          division,
          className: cn(
            isClickable && "cursor-pointer w-full text-left",
            className
          )
        })
      )}
      {...cardProps}
      as={CardComponent}
    >
      {cardContent}
    </Card>
  );
};

export default AppCard;
