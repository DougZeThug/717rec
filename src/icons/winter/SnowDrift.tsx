import React from 'react';

interface SnowDriftProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Snow Drift glyph - Wavy snow pile
 * Used for section dividers, decorative breaks
 */
const SnowDrift: React.FC<SnowDriftProps> = ({ size = 24, className, ...props }) => (
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
    {/* Main snow drift curve */}
    <path d="M2 18 Q6 14 10 16 Q14 18 18 14 Q20 12 22 14" fill="currentColor" fillOpacity="0.1" />
    <path d="M2 18 Q6 14 10 16 Q14 18 18 14 Q20 12 22 14" />
    {/* Secondary drift layer */}
    <path d="M4 20 Q8 17 12 19 Q16 21 20 18" strokeWidth="1" opacity="0.7" />
    {/* Falling snowflakes above */}
    <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" opacity="0.5" />
    <circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="19" cy="7" r="0.8" fill="currentColor" stroke="none" opacity="0.4" />
    <circle cx="8" cy="10" r="0.6" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="16" cy="9" r="0.7" fill="currentColor" stroke="none" opacity="0.5" />
  </svg>
);

export default SnowDrift;
