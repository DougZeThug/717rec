import React from 'react';

interface SparkleFrostProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Sparkle Frost glyph - Celebration/success winter accent
 * Used for success animations, celebration effects
 */
const SparkleFrost: React.FC<SparkleFrostProps> = ({ size = 24, className, ...props }) => (
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
    {/* Main center sparkle */}
    <path d="M12 3 L13 9 L12 12 L11 9 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 21 L11 15 L12 12 L13 15 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M3 12 L9 11 L12 12 L9 13 Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M21 12 L15 13 L12 12 L15 11 Z" fill="currentColor" fillOpacity="0.2" />
    <line x1="12" y1="3" x2="12" y2="21" />
    <line x1="3" y1="12" x2="21" y2="12" />
    {/* Diagonal sparkle arms */}
    <line x1="5" y1="5" x2="9" y2="9" />
    <line x1="19" y1="5" x2="15" y2="9" />
    <line x1="5" y1="19" x2="9" y2="15" />
    <line x1="19" y1="19" x2="15" y2="15" />
    {/* Outer frost dots */}
    <circle cx="12" cy="1" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="12" cy="23" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="1" cy="12" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="23" cy="12" r="0.75" fill="currentColor" stroke="none" />
    {/* Corner sparkle accents */}
    <circle cx="3.5" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="20.5" cy="3.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="20.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="20.5" cy="20.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export default SparkleFrost;
