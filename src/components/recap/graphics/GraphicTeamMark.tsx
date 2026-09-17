import React from 'react';

import { recapColors, recapFonts } from './recapGraphicTokens';

interface GraphicTeamMarkProps {
  teamName: string;
  /** Already resolved for export — a data URL when captured, a URL on screen. */
  logoSrc: string | null;
  size: number;
}

/**
 * A team's logo, or its initials when there is none.
 *
 * The fallback matters more here than on screen: a logo that fails to inline
 * during export would otherwise leave a hole in a published graphic. Drawing
 * initials means one missing image degrades rather than ruining the pack.
 */
const initialsOf = (teamName: string): string =>
  teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

const GraphicTeamMark: React.FC<GraphicTeamMarkProps> = ({ teamName, logoSrc, size }) => {
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    flexShrink: 0,
    objectFit: 'cover',
  };

  if (logoSrc) {
    return <img src={logoSrc} alt="" style={shared} crossOrigin="anonymous" />;
  }

  return (
    <div
      style={{
        ...shared,
        backgroundColor: recapColors.wood,
        color: recapColors.navyDeep,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: recapFonts.display,
        fontSize: size * 0.44,
        letterSpacing: '0.04em',
      }}
    >
      {initialsOf(teamName)}
    </div>
  );
};

export default GraphicTeamMark;
