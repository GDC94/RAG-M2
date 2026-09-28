import { type UIEvent, useCallback, useState } from 'react';

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** Tolerance for sub-pixel scroll positions (zoom, fractional DPR). */
const EDGE_EPSILON_PX = 1;

/** Which sides of a scroll container have content hidden beyond the edge. */
export function scrollEdges({ scrollTop, scrollHeight, clientHeight }: ScrollMetrics) {
  return {
    top: scrollTop > EDGE_EPSILON_PX,
    bottom: scrollTop + clientHeight < scrollHeight - EDGE_EPSILON_PX,
  };
}

/** Tracks whether a scroll container has hidden content above/below, so the
 * caller can fade that edge (see the `mask-fade-y` utility in index.css). */
export function useScrollFade() {
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const onScroll = useCallback((event: UIEvent<HTMLElement>) => {
    const next = scrollEdges(event.currentTarget);
    setEdges((previous) =>
      previous.top === next.top && previous.bottom === next.bottom ? previous : next,
    );
  }, []);

  return { onScroll, fadeTop: edges.top, fadeBottom: edges.bottom };
}
