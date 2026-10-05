/**
 * Build the text a screen reader hears for a chart. A chart is a picture, so
 * `role="img"` plus this label is its text alternative. Long lists are cut off
 * with a count so the label stays short enough to listen to.
 */
export const describeChart = (intro: string, items: string[], maxItems = 10): string => {
  if (items.length === 0) return intro;

  const shown = items.slice(0, maxItems).join('; ');
  const hidden = items.length - maxItems;
  return hidden > 0 ? `${intro} ${shown}; and ${hidden} more.` : `${intro} ${shown}.`;
};
