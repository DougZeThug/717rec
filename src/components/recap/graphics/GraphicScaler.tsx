import React from 'react';

import { RECAP_GRAPHIC_HEIGHT, RECAP_GRAPHIC_WIDTH } from './recapGraphicTokens';

interface GraphicScalerProps {
  /** 1 renders at full 1080x1350. 0.4 fits a preview column. */
  scale: number;
  children: React.ReactNode;
}

/**
 * Shows a full-size graphic shrunk to fit, without changing its layout.
 *
 * `transform: scale()` is a paint-time operation, so everything inside keeps
 * its 1080x1350 geometry and the preview is exactly what exports. `zoom` would
 * not do this — it is non-standard and re-runs layout, so text would re-wrap at
 * preview size and the PNG would differ from what the admin approved.
 */
const GraphicScaler: React.FC<GraphicScalerProps> = ({ scale, children }) => (
  <div
    style={{
      width: RECAP_GRAPHIC_WIDTH * scale,
      height: RECAP_GRAPHIC_HEIGHT * scale,
      overflow: 'hidden',
    }}
  >
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
  </div>
);

export default GraphicScaler;
