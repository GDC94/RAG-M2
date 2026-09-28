import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * A numeric value that "replays" from 0 up to `target` a short delay after
 * `animKey` changes — used by `ScoreRing`'s ring fill and `TimingsGantt`'s
 * bar widths so they visibly redraw each time the detail panel (re)opens on
 * a tab, instead of only animating on first mount.
 *
 * With reduced motion, the value jumps straight to `target` with no reset
 * and no delay.
 */
export function useReplayValue(target: number, animKey: number, delayMs = 350): number {
  const reduce = useReducedMotion() ?? false;
  const [value, setValue] = useState(reduce ? target : 0);

  // `animKey` intentionally retriggers this effect even though it's never
  // read in its body — it's the caller's signal to replay.
  // biome-ignore lint/correctness/useExhaustiveDependencies: animKey is a deliberate replay trigger, not a value read in the effect body
  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }

    setValue(0);
    const id = window.setTimeout(() => setValue(target), delayMs);
    return () => window.clearTimeout(id);
  }, [target, animKey, reduce, delayMs]);

  return value;
}
