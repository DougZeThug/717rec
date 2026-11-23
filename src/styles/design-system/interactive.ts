/**
 * Link styles with consistent hover states
 */
export const interactive = {
  // Link styles
  link: {
    default:
      'text-cornhole-navy hover:text-cornhole-navy/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200',
    subtle: 'text-muted-foreground hover:text-foreground transition-colors duration-200',
    underline:
      'text-cornhole-navy hover:text-cornhole-navy/80 underline-offset-4 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200',
    // A link inside a sentence. Underlined at rest, because colour alone does
    // not distinguish it from the muted text around it, and lightened in dark
    // mode, where the shared primary blue sits at 3.84:1 on a near-black card.
    inline:
      'text-primary underline underline-offset-4 hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200',
  },
};
