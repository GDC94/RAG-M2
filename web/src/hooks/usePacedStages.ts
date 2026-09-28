import { useEffect, useRef, useState } from 'react';
import type { StageName } from '@/features/ask/schemas';
import type { TurnStages } from '@/features/ask/useAsk';
import {
  advance,
  initialState,
  isSettled,
  type PacedState,
} from '@/features/workbench/chat/pacing';

export interface UsePacedStagesResult {
  /** The stages to display: paced towards `real`, never ahead of it. */
  stages: TurnStages;
  /** `true` once the displayed stages equal `real`. */
  settled: boolean;
}

/**
 * Paces the display of a turn's stage timeline towards its real state (see
 * `pacing.ts` for the rules and why this exists). Re-derives on every `real`
 * or `skipped` change and self-schedules `setTimeout`s to advance further
 * (dwell timers, skip-jumps) without waiting on new props.
 */
export function usePacedStages(
  real: TurnStages,
  skipped: readonly StageName[],
): UsePacedStagesResult {
  const [paced, setPaced] = useState<PacedState>(() => initialState(real));
  const pacedRef = useRef(paced);
  pacedRef.current = paced;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function run() {
      const now = Date.now();
      const result = advance(pacedRef.current, real, skipped, now);
      if (result.changed) {
        pacedRef.current = result.state;
        setPaced(result.state);
      }
      if (result.retryDelayMs !== null) {
        timer = setTimeout(run, result.retryDelayMs);
      }
    }

    run();

    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [real, skipped]);

  return { stages: paced.stages, settled: isSettled(paced.stages, real) };
}
