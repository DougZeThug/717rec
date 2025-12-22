import React from "react";
import { cn } from "@/lib/utils";

export type SnowtopTextAs = "span" | "h1" | "h2" | "h3" | "div";

interface SnowtopTextProps {
  as?: SnowtopTextAs;
  className?: string;
  children: React.ReactNode;
}

/**
 * Snowtop Caps has transparent "snow" cutouts in the glyphs.
 * This component renders two perfectly-aligned layers:
 * - back layer (snow): near-white
 * - front layer (body): frost blue
 */
export default function SnowtopText({ as = "span", className, children }: SnowtopTextProps) {
  const Comp = as;

  return (
    <Comp className={cn("relative inline-block font-snowtop", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 pointer-events-none select-none",
          "snowtop-layer-back"
        )}
      >
        {children}
      </span>
      <span className={cn("relative", "snowtop-layer-front")}>{children}</span>
    </Comp>
  );
}
