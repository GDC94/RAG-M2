import { useEffect, useState } from 'react';

/** Tracks `window.innerWidth`, kept in sync via a `resize` listener. Used by
 * `WorkbenchContainer` to feed `computeLayout` (see
 * `features/workbench/workbenchSelectors.ts`) so the 3-column grid reflows
 * as the browser window changes size. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
