
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

  // Try to find original team name from the payload
  const firstItem = payload[0]?.payload || {};
  const tooltipName =
    typeof firstItem.tooltipName === "string"
      ? firstItem.tooltipName
      : label; // fallback to label

  return (
    <div className="rounded-md shadow-lg p-2 bg-popover border border-border">
      <p className="text-popover-foreground font-semibold mb-1">{tooltipName}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={`tooltip-${idx}`} style={{ color: entry.color }} className="m-0 text-sm">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default WinLossTooltip;
