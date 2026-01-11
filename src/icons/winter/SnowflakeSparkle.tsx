import React from 'react';

interface SnowflakeSparkleProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Snowflake with sparkle effect - Enhanced winter accent
 * Used for hero sections, special highlights
 */
const SnowflakeSparkle: React.FC<SnowflakeSparkleProps> = ({ size = 24, className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Main snowflake - smaller to make room for sparkles */}
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="12" y1="4" x2="10" y2="6" />
    <line x1="12" y1="4" x2="14" y2="6" />
    <line x1="12" y1="20" x2="10" y2="18" />
    <line x1="12" y1="20" x2="14" y2="18" />
    {/* Horizontal arms */}
    <line x1="5" y1="12" x2="19" y2="12" />
    <line x1="5" y1="12" x2="7" y2="10" />
    <line x1="5" y1="12" x2="7" y2="14" />
    <line x1="19" y1="12" x2="17" y2="10" />
    <line x1="19" y1="12" x2="17" y2="14" />
    {/* Sparkle dots in corners */}
    <circle cx="3" cy="3" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="21" cy="3" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="3" cy="21" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="21" cy="21" r="0.5" fill="currentColor" stroke="none" />
    {/* Extra sparkle lines */}
    <line x1="2" y1="3" x2="4" y2="3" strokeWidth="1" />
    <line x1="3" y1="2" x2="3" y2="4" strokeWidth="1" />
    <line x1="20" y1="21" x2="22" y2="21" strokeWidth="1" />
    <line x1="21" y1="20" x2="21" y2="22" strokeWidth="1" />
  </svg>
);

export default SnowflakeSparkle;
