import { useEffect, useState } from 'react';

/**
 * Rounded whole seconds elapsed since `startedAt` (a `Date.now()` timestamp),
 * ticking every second while `running` is `true`. Once `running` turns
 * `false`, the returned value freezes at whatever it last reached — used as
 * the client-side elapsed-time fallback for a "Trabajó N s" label when the
 * server-reported timing is unavailable.
 */
export function useElapsedSeconds(startedAt: number | null, running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running || startedAt === null) return;

    const tick = () => setElapsed(Math.round((Date.now() - startedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  return elapsed;
}
