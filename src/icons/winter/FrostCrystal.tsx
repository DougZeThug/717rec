import React from 'react';

interface FrostCrystalProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Frost Crystal glyph - Geometric winter accent
 * Used for card accents, decorative corners
 */
const FrostCrystal: React.FC<FrostCrystalProps> = ({ size = 24, className, ...props }) => (
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
    {/* Central hexagon */}
    <polygon
      points="12,3 18.5,7.5 18.5,16.5 12,21 5.5,16.5 5.5,7.5"
      fill="currentColor"
      fillOpacity="0.1"
    />
    <polygon points="12,3 18.5,7.5 18.5,16.5 12,21 5.5,16.5 5.5,7.5" />
    {/* Inner crystal lines */}
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="5.5" y1="7.5" x2="18.5" y2="16.5" />
    <line x1="18.5" y1="7.5" x2="5.5" y2="16.5" />
    {/* Crystal facet highlights */}
    <line x1="12" y1="3" x2="8" y2="6" strokeWidth="1" />
    <line x1="12" y1="3" x2="16" y2="6" strokeWidth="1" />
    <line x1="12" y1="21" x2="8" y2="18" strokeWidth="1" />
    <line x1="12" y1="21" x2="16" y2="18" strokeWidth="1" />
  </svg>
);

export default FrostCrystal;
