import React from "react";

interface WinterStarProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Winter Star glyph - Icy star variant
 * Used for special winter badges, achievements
 */
const WinterStar: React.FC<WinterStarProps> = ({ 
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
    {/* Main 4-point star */}
    <path 
      d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" 
      fill="currentColor" 
      fillOpacity="0.15" 
    />
    <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
    {/* Inner sparkle/frost lines */}
    <line x1="12" y1="7" x2="12" y2="10" strokeWidth="1" />
    <line x1="12" y1="14" x2="12" y2="17" strokeWidth="1" />
    <line x1="7" y1="12" x2="10" y2="12" strokeWidth="1" />
    <line x1="14" y1="12" x2="17" y2="12" strokeWidth="1" />
    {/* Small corner frost accents */}
    <circle cx="6" cy="6" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="6" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="6" cy="18" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="18" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export default WinterStar;
