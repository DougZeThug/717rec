
import React from "react";

// Tooltip for Win-Loss Chart
interface WinLossTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const WinLossTooltip: React.FC<WinLossTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md shadow-lg p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <p className="text-gray-800 dark:text-white font-semibold mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={`tooltip-${idx}`} style={{ color: entry.color }} className="m-0 text-sm">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default WinLossTooltip;
