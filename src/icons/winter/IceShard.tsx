import React from "react";

interface IceShardProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Ice Shard glyph - Sharp crystalline fragment
 * Used for warning/alert winter variant, destructive actions
 */
const IceShard: React.FC<IceShardProps> = ({ 
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
    {/* Main shard shape */}
    <path 
      d="M12 2 L17 8 L15 14 L18 22 L12 18 L6 22 L9 14 L7 8 Z" 
      fill="currentColor" 
      fillOpacity="0.1" 
    />
    <path d="M12 2 L17 8 L15 14 L18 22 L12 18 L6 22 L9 14 L7 8 Z" />
    {/* Internal facet lines */}
    <line x1="12" y1="2" x2="12" y2="18" strokeWidth="1" />
    <line x1="7" y1="8" x2="12" y2="10" strokeWidth="0.75" />
    <line x1="17" y1="8" x2="12" y2="10" strokeWidth="0.75" />
    <line x1="9" y1="14" x2="12" y2="13" strokeWidth="0.75" />
    <line x1="15" y1="14" x2="12" y2="13" strokeWidth="0.75" />
    {/* Frost highlights */}
    <circle cx="12" cy="6" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="10" cy="11" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11" r="0.4" fill="currentColor" stroke="none" />
  </svg>
);

export default IceShard;
