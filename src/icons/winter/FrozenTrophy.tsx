import React from 'react';

interface FrozenTrophyProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Frozen Trophy glyph - Winter champion badge
 * Used for winter tournament winners, seasonal achievements
 */
const FrozenTrophy: React.FC<FrozenTrophyProps> = ({ size = 24, className, ...props }) => (
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
    {/* Trophy cup */}
    <path d="M6 4 L6 8 Q6 14 12 14 Q18 14 18 8 L18 4 Z" fill="currentColor" fillOpacity="0.1" />
    <path d="M6 4 L6 8 Q6 14 12 14 Q18 14 18 8 L18 4 Z" />
    {/* Trophy handles with icicles */}
    <path d="M6 6 Q3 6 3 9 Q3 11 5 11" />
    <line x1="4" y1="11" x2="4" y2="13" strokeWidth="1" />
    <path d="M18 6 Q21 6 21 9 Q21 11 19 11" />
    <line x1="20" y1="11" x2="20" y2="13" strokeWidth="1" />
    {/* Trophy stem and base */}
    <line x1="12" y1="14" x2="12" y2="18" />
    <path d="M8 18 L16 18 L15 20 L9 20 Z" />
    {/* Frost/ice crystal inside trophy */}
    <line x1="12" y1="6" x2="12" y2="11" strokeWidth="1" />
    <line x1="9" y1="8" x2="15" y2="8" strokeWidth="1" />
    <line x1="10" y1="6" x2="14" y2="10" strokeWidth="0.75" />
    <line x1="14" y1="6" x2="10" y2="10" strokeWidth="0.75" />
    {/* Ice sparkles */}
    <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export default FrozenTrophy;
