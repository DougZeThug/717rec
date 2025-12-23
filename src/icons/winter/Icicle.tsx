import React from "react";

interface IcicleProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Icicle glyph - Decorative winter accent
 * Used for borders, dividers, hanging decorations
 */
const Icicle: React.FC<IcicleProps> = ({ 
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
    {/* Top bar */}
    <line x1="2" y1="2" x2="22" y2="2" strokeWidth="2" />
    {/* Icicles hanging down */}
    <path d="M4 2 L4 8 L5 12 L4 8 L4 2" fill="currentColor" fillOpacity="0.2" />
    <path d="M4 2 V12" />
    <path d="M8 2 L8 14 L9 18 L8 14 L8 2" fill="currentColor" fillOpacity="0.2" />
    <path d="M8 2 V18" />
    <path d="M12 2 L12 16 L13 22 L12 16 L12 2" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 2 V22" />
    <path d="M16 2 L16 10 L17 15 L16 10 L16 2" fill="currentColor" fillOpacity="0.2" />
    <path d="M16 2 V15" />
    <path d="M20 2 L20 6 L21 9 L20 6 L20 2" fill="currentColor" fillOpacity="0.2" />
    <path d="M20 2 V9" />
  </svg>
);

export default Icicle;
