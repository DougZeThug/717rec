
import React from "react";
import { BracketConnection, BracketTheme } from "../types/bracketTypes";

interface ConnectorLinesProps {
  connections: BracketConnection[];
  theme: BracketTheme;
  className?: string;
}

const ConnectorLines: React.FC<ConnectorLinesProps> = ({
  connections,
  theme,
  className = ""
}) => {
  const getStrokeColor = (type: BracketConnection['type']) => {
    switch (type) {
      case 'winners':
        return theme.colors.winners;
      case 'losers':
        return theme.colors.losers;
      case 'finals':
        return theme.colors.finals;
      default:
        return theme.colors.border;
    }
  };

  return (
    <svg 
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ overflow: 'visible' }}
    >
      {connections.map(connection => (
        <path
          key={connection.id}
          d={connection.path}
          stroke={getStrokeColor(connection.type)}
          strokeWidth="2"
          fill="none"
          className="transition-colors duration-300"
        />
      ))}
    </svg>
  );
};

export default ConnectorLines;
