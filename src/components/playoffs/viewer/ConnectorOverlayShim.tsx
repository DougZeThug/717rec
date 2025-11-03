import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type MatchID = string | number;
type Opp = { id: MatchID | null; source_node_id?: MatchID; source_type?: 'winner' | 'loser' };
type Match = { id: MatchID; opponent1?: Opp | null; opponent2?: Opp | null };

function useResizeObserver(el: HTMLElement | null, onResize: () => void) {
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, onResize]);
}

const midRight = (root: DOMRect, el: HTMLElement | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - root.left + r.width, y: r.top - root.top + r.height / 2 };
};

const midLeft = (root: DOMRect, el: HTMLElement | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - root.left, y: r.top - root.top + r.height / 2 };
};

const elbow = (a:{x:number;y:number}, b:{x:number;y:number}) => {
  const mx = (a.x + b.x)/2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
};

export default function ConnectorOverlayShim({
  containerId,
  overlayId,
  matches,
  enabled,
}: {
  containerId: string;
  overlayId: string;
  matches: Match[];
  enabled: boolean;
}) {
  const overlayEl = document.getElementById(overlayId);
  const containerEl = document.getElementById(containerId) as HTMLElement | null;
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => setTick(t => t + 1), []);
  useResizeObserver(containerEl, () => setTick(t => t + 1));
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  if (!enabled || !overlayEl || !containerEl) return null;

  const rootRect = containerEl.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rootRect.width));
  const height = Math.max(1, Math.floor(rootRect.height));

  // map data-match-id → element
  const byId = new Map<MatchID, HTMLElement>();
  containerEl.querySelectorAll<HTMLElement>('.match').forEach(el => {
    const idAttr = el.getAttribute('data-match-id');
    if (idAttr) byId.set(isNaN(+idAttr) ? idAttr : +idAttr, el);
  });

  const edges = useMemo(() => {
    const es: Array<{from: MatchID; to: MatchID}> = [];
    for (const m of matches) {
      const s1 = m.opponent1?.source_node_id;
      const s2 = m.opponent2?.source_node_id;
      if (s1 != null) es.push({ from: s1, to: m.id });
      if (s2 != null) es.push({ from: s2, to: m.id });
    }
    return es;
  }, [matches]);

  const paths: JSX.Element[] = [];
  for (const e of edges) {
    const fromEl = byId.get(e.from);
    const toEl = byId.get(e.to);
    if (!fromEl || !toEl) continue;
    const A = midRight(rootRect, fromEl);
    const B = midLeft(rootRect, toEl);
    if (!A || !B) continue;
    paths.push(
      <path key={`${String(e.from)}->${String(e.to)}`} d={elbow(A,B)}
        fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    );
  }

  const svg = (
    <svg
      data-testid="connector-overlay"
      width={width}
      height={height}
      style={{ position:'absolute', inset: 0, pointerEvents:'none' }}
    >
      {paths}
    </svg>
  );

  return createPortal(svg, overlayEl);
}
