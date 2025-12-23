import React from "react";

interface SnowCloudProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Snow Cloud glyph - Weather/seasonal indicator
 * Used for weather themes, seasonal indicators
 */
const SnowCloud: React.FC<SnowCloudProps> = ({ 
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
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Cloud shape */}
    <path 
      d="M4 14 Q2 14 2 12 Q2 10 4 10 Q4 6 8 6 Q10 4 13 5 Q16 4 18 7 Q21 7 21 10 Q22 12 20 13 Q20 14 18 14 Z" 
      fill="currentColor" 
      fillOpacity="0.1" 
    />
    <path d="M4 14 Q2 14 2 12 Q2 10 4 10 Q4 6 8 6 Q10 4 13 5 Q16 4 18 7 Q21 7 21 10 Q22 12 20 13 Q20 14 18 14 Z" />
    {/* Falling snow - small snowflakes */}
    <circle cx="6" cy="17" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="10" cy="19" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="14" cy="17.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="18" cy="19.5" r="0.5" fill="currentColor" stroke="none" />
    {/* Tiny snowflake patterns */}
    <line x1="8" y1="21" x2="8" y2="23" strokeWidth="0.75" />
    <line x1="7" y1="22" x2="9" y2="22" strokeWidth="0.75" />
    <line x1="16" y1="21.5" x2="16" y2="23" strokeWidth="0.75" />
    <line x1="15.2" y1="22.25" x2="16.8" y2="22.25" strokeWidth="0.75" />
  </svg>
);

export default SnowCloud;
