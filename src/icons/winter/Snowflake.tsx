import React from "react";

interface SnowflakeProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Custom Snowflake glyph - Primary winter accent icon
 * Used for badges, theme toggle, cold streaks
 */
const Snowflake: React.FC<SnowflakeProps> = ({ 
  size = 24, 
  className,
  ...props 
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Center vertical line */}
    <line x1="12" y1="2" x2="12" y2="22" />
    {/* Top branches */}
    <line x1="12" y1="2" x2="9" y2="5" />
    <line x1="12" y1="2" x2="15" y2="5" />
    {/* Bottom branches */}
    <line x1="12" y1="22" x2="9" y2="19" />
    <line x1="12" y1="22" x2="15" y2="19" />
    {/* Diagonal line (top-left to bottom-right) */}
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="4.93" />
    <line x1="4.93" y1="4.93" x2="4.93" y2="7.76" />
    <line x1="19.07" y1="19.07" x2="16.24" y2="19.07" />
    <line x1="19.07" y1="19.07" x2="19.07" y2="16.24" />
    {/* Diagonal line (top-right to bottom-left) */}
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="16.24" y2="4.93" />
    <line x1="19.07" y1="4.93" x2="19.07" y2="7.76" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="19.07" />
    <line x1="4.93" y1="19.07" x2="4.93" y2="16.24" />
  </svg>
);

export default Snowflake;
