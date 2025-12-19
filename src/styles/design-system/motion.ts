
/**
 * Motion design tokens for consistent animations across the app
 * Provides timing, easing, and scale values for interactive feedback
 */

export const motion = {
  // Timing constants
  duration: {
    instant: "50ms",
    fast: "100ms",
    normal: "150ms",
    pageTransition: "200ms",
    expandCollapse: "200ms",
  },
  
  // Easing curves
  easing: {
    default: "ease-out",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  // Scale values for pressed states
  press: {
    button: 0.97,
    card: 0.98,
    row: 0.99,
    subtle: 0.995,
  },
  
  // Page transition offsets
  slide: {
    small: 8,
    medium: 12,
  },
  
  // Tailwind class presets for common interaction patterns
  classes: {
    // Button pressed state
    buttonPress: "active:scale-[0.97] transition-transform duration-100",
    
    // Card pressed state with tint
    cardPress: "active:scale-[0.98] active:bg-accent/5 transition-all duration-100",
    
    // Row/list item pressed state
    rowPress: "active:scale-[0.99] active:bg-accent/10 transition-all duration-100",
    
    // Tab pressed state
    tabPress: "active:scale-[0.98] transition-transform duration-100",
    
    // Subtle press for large areas
    subtlePress: "active:scale-[0.995] transition-transform duration-100",
    
    // Mobile-friendly tint feedback
    mobileTint: "active:bg-foreground/5 dark:active:bg-foreground/10",
  }
};

// Framer Motion variants for page transitions
export const pageTransitionVariants = {
  initial: { 
    opacity: 0, 
    y: 8 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Framer Motion variants for expand/collapse
export const expandCollapseVariants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  expanded: { 
    height: "auto", 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Framer Motion variants for success confirmation
export const successFlashVariants = {
  idle: { scale: 1 },
  loading: { scale: 1 },
  success: { 
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 }
  }
};
