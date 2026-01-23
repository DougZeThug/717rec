import { useCallback, useEffect, useState } from 'react';

interface BracketDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  estimatedSize: 'small' | 'medium' | 'large';
}

interface UseBracketDimensionsReturn extends BracketDimensions {
  calculateInitialZoom: (containerWidth: number, containerHeight: number) => number;
  isLargeBracket: boolean;
}

export const useBracketDimensions = (
  matchCount: number,
  bracketFormat: string
): UseBracketDimensionsReturn => {
  const [dimensions, setDimensions] = useState<BracketDimensions>({
    width: 0,
    height: 0,
    aspectRatio: 1,
    estimatedSize: 'medium',
  });

  const estimateBracketSize = useCallback((matches: number, format: string): BracketDimensions => {
    // Base match card dimensions
    const MATCH_WIDTH = 280;
    const MATCH_HEIGHT = 160;
    const SPACING = 40;

    // Estimate bracket structure based on match count and format
    let estimatedWidth = 0;
    let estimatedHeight = 0;
    let rounds = 0;

    if (format === 'double') {
      // Double elimination has winners and losers bracket
      // Rough estimation: matches / 2 for winners bracket rounds
      rounds = Math.ceil(Math.log2(matches / 2)) + 1;
      estimatedWidth = rounds * (MATCH_WIDTH + SPACING) * 2; // Two brackets side by side
      estimatedHeight = Math.max(matches / 2, 4) * (MATCH_HEIGHT + SPACING);
    } else {
      // Single elimination
      rounds = Math.ceil(Math.log2(matches)) + 1;
      estimatedWidth = rounds * (MATCH_WIDTH + SPACING);
      estimatedHeight = Math.max(matches / 2, 4) * (MATCH_HEIGHT + SPACING);
    }

    const aspectRatio = estimatedWidth / estimatedHeight;

    // Determine size category
    let estimatedSize: 'small' | 'medium' | 'large' = 'medium';
    if (matches <= 7) {
      estimatedSize = 'small';
    } else if (matches >= 15) {
      estimatedSize = 'large';
    }

    return {
      width: estimatedWidth,
      height: estimatedHeight,
      aspectRatio,
      estimatedSize,
    };
  }, []);

  useEffect(() => {
    const newDimensions = estimateBracketSize(matchCount, bracketFormat);
    setDimensions(newDimensions);
  }, [matchCount, bracketFormat, estimateBracketSize]);

  const calculateInitialZoom = useCallback(
    (containerWidth: number, containerHeight: number): number => {
      if (dimensions.width === 0 || dimensions.height === 0) return 1;

      const padding = 40; // Padding around the bracket
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;

      const scaleX = availableWidth / dimensions.width;
      const scaleY = availableHeight / dimensions.height;

      // Use the smaller scale to ensure it fits both dimensions
      const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

      // For large brackets, be more aggressive about fitting
      if (dimensions.estimatedSize === 'large') {
        return Math.max(scale, 0.3); // Minimum 30% for large brackets
      }

      return Math.max(scale, 0.5); // Minimum 50% for smaller brackets
    },
    [dimensions]
  );

  const isLargeBracket = dimensions.estimatedSize === 'large';

  return {
    ...dimensions,
    calculateInitialZoom,
    isLargeBracket,
  };
};
