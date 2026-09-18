import React from 'react';
import { createPortal } from 'react-dom';

import {
  RECAP_GRAPHIC_HEIGHT,
  RECAP_GRAPHIC_WIDTH,
} from '@/components/recap/graphics/recapGraphicTokens';

interface OffscreenGraphicProps {
  innerRef: React.MutableRefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

/**
 * Mounts a graphic at full size, off screen, for capture.
 *
 * Positioned far off to the left rather than hidden. `display: none` and
 * `visibility: hidden` both give the node no measurable box, and html-to-image
 * measures what it captures — the export would come out blank. `position:
 * fixed` keeps it out of flow, so it cannot add a scrollbar or shift the admin
 * page under the user.
 */
const OffscreenGraphic: React.FC<OffscreenGraphicProps> = ({ innerRef, children }) =>
  createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: -10000,
        top: 0,
        width: RECAP_GRAPHIC_WIDTH,
        height: RECAP_GRAPHIC_HEIGHT,
        pointerEvents: 'none',
        contain: 'layout size',
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>,
    document.body
  );

export default OffscreenGraphic;
