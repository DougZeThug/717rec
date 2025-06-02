
import React, { useMemo } from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { processBracketData } from "./utils/bracketDataProcessor";
import { calculateLayout } from "./utils/layoutCalculator";
import { getTheme } from "./styles/bracketThemes";
import BracketLayout from "./layout/BracketLayout";
import { BracketStyleProps } from "./types/bracketTypes";

interface DoubleEliminationBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
  styleProps?: BracketStyleProps;
}

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ 
  bracket, 
  onMatchClick,
  styleProps = {}
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Get theme configuration with mobile detection
  const theme = useMemo(() => {
    const themeName = styleProps.theme?.name || (isDark ? 'default' : 'light');
    return styleProps.theme || getTheme(themeName, styleProps.size);
  }, [isDark, styleProps.theme, styleProps.size]);

  // Process and layout bracket data
  const processedData = useMemo(() => {
    const processed = processBracketData(bracket);
    return calculateLayout(processed, theme);
  }, [bracket, theme]);

  if (!bracket.matches || bracket.matches.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No matches found in this bracket</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full transition-colors duration-300",
      "overflow-hidden" // Remove auto scroll, let layout handle it
    )}>
      {/* Header */}
      <div className="mb-6 px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: theme.colors.text }}>
          {bracket.name}
        </h2>
        <p className="text-xs md:text-sm opacity-70" style={{ color: theme.colors.text }}>
          {bracket.format} • {bracket.state}
        </p>
      </div>

      {/* Bracket - Mobile-first design */}
      <BracketLayout
        data={processedData}
        theme={theme}
        onMatchClick={onMatchClick}
        showConnectors={styleProps.showConnectors}
        className="bracket-container"
      />
    </div>
  );
};

export default DoubleEliminationBracket;
