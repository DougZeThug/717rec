
import * as React from "react"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { gradients, getDivisionGradientClass } from "@/styles/design-system"

interface CardVariantProps {
  variant?: "default" | "subtle" | "highlight" | "elevated" | "interactive";
  division?: string | null;
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CardVariantProps
>(({ className, variant = "default", division, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Get the appropriate gradient based on variant and division
  const gradientClass = division 
    ? gradients.card.division[division.toLowerCase()] || getDivisionGradientClass(division)
    : gradients.card[variant];
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
        isLight ? gradientClass : "",
        isLight ? "!text-[#222222]" : "",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        isLight ? "!text-[#111111]" : "",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        isLight ? "!text-[#444444] !font-medium" : "",
        className
      )}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
