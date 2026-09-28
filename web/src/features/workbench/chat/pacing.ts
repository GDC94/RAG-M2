import { STAGE_NAMES, type StageName } from '@/features/ask/schemas';
import type { TurnStages } from '@/features/ask/useAsk';

/**
 * Pure pacing layer for the working-state step timeline.
 *
 * The backend's real per-stage timings (surfaced elsewhere, e.g. the detail
 * panel's timing gantt) must stay real. This module only paces the *display*
 * of `turn.stages`, because the raw NDJSON events can carry a stage's start
 * and end in the same stream chunk (a ~7ms `search` stage is the common
 * case), which React batches into a single render — the "running" state is
 * never painted. It also keeps the working timeline visible for a moment
 * after a `success` result arrives so trailing steps can be seen settling.
 *
 * `advance` is a single-step reducer: given the currently displayed stages
 * and the real stages, it applies at most one status transition and reports
 * when the caller should retry (`retryDelayMs`). `retryDelayMs` is `null`
 * when the only thing that can unblock further progress is a change to
 * `real` (the caller should wait for new props, not a timer); it is a
 * non-negative number when a known dwell/immediate retry will unblock
 * progress regardless of `real`. `usePacedStages` (see `useHooks/usePacedStages.ts`)
 * drives this to completion via `setTimeout`.
 *
 * The dwell timer's start time (`since`) is state-owned rather than passed
 * per call, since only one stage can be dwelling at a time (the sequential
 * ordering rule guarantees it) and threading it as a return value keeps the
 * hook from having to reconstruct it.
 */

/** Minimum time (ms) a stage must be shown 'in-progress' before it may be
 * shown 'completed', so a start+end pair that lands in the same render is
 * still perceivable. */
export const MIN_STEP_MS = 400;

export interface PacedState {
  stages: TurnStages;
  /** Timestamp (`Date.now()`) since the currently in-progress displayed
   * stage started dwelling, or `null` when no stage is in-progress. */
  since: number | null;
}

export interface AdvanceResult {
  state: PacedState;
  changed: boolean;
  /** `null` when progress is blocked on `real` changing; otherwise the
   * number of ms after which the caller should call `advance` again. */
  retryDelayMs: number | null;
}

/** The initial paced state: displayed stages start out equal to `real`
 * (normally all `pending` for a fresh turn), with nothing dwelling. */
export function initialState(real: TurnStages): PacedState {
  return { stages: { ...real }, since: null };
}

export function isSettled(displayed: TurnStages, real: TurnStages): boolean {
  return STAGE_NAMES.every((name) => displayed[name] === real[name]);
}

function unchanged(state: PacedState, retryDelayMs: number | null): AdvanceResult {
  return { state, changed: false, retryDelayMs };
}

/**
 * Applies status transitions to `state.stages`, in `STAGE_NAMES` order,
 * following these rules:
 *  - Displayed never gets ahead of `real`: a stage can only be shown
 *    'in-progress' once real is 'in-progress' or 'completed', and shown
 *    'completed' only once real is 'completed'.
 *  - At most one stage is ever shown 'in-progress' at a time. A stage shown
 *    'in-progress' must dwell at least `MIN_STEP_MS` before it may be shown
 *    'completed' — and the moment it is, the next stage (if unblocked)
 *    starts its own 'in-progress' dwell immediately, in the same call, so
 *    the timeline hands off without a visible gap.
 *  - Stage i+1 cannot be shown 'in-progress' until stage i is shown
 *    'completed' (this falls out of scanning stages in order and stopping
 *    at the first one that isn't `completed`/`cancelled` yet).
 *  - A stage listed in `skipped` (never ran) jumps straight from 'pending'
 *    to 'completed', skipping the 'in-progress' step and its dwell, and
 *    (like a completed dwell) immediately hands off to the next stage.
 *  - If `real` has any stage 'cancelled' (user stopped / error), pacing is
 *    abandoned entirely and the displayed stages snap to `real` immediately.
 *
 * Returns after the first transition that isn't immediately followed by
 * another (i.e. `retryDelayMs` isn't `0`), or once nothing more can be done
 * right now.
 */
export function advance(
  state: PacedState,
  real: TurnStages,
  skipped: readonly StageName[],
  now: number,
): AdvanceResult {
  let current = state;
  let changedAny = false;

  for (;;) {
    const step = advanceOnce(current, real, skipped, now);
    if (!step.changed)
      return { state: current, changed: changedAny, retryDelayMs: step.retryDelayMs };

    current = step.state;
    changedAny = true;
    if (step.retryDelayMs !== 0)
      return { state: current, changed: true, retryDelayMs: step.retryDelayMs };
    // retryDelayMs === 0: an immediate hand-off is possible — cascade.
  }
}

/** Applies at most one status transition; see `advance` for the rules. */
function advanceOnce(
  state: PacedState,
  real: TurnStages,
  skipped: readonly StageName[],
  now: number,
): AdvanceResult {
  const hasCancellation = STAGE_NAMES.some((name) => real[name] === 'cancelled');
  if (hasCancellation) {
    if (isSettled(state.stages, real)) return unchanged(state, null);
    return {
      state: { stages: { ...real }, since: null },
      changed: true,
      retryDelayMs: null,
    };
  }

  for (const name of STAGE_NAMES) {
    const displayedStatus = state.stages[name];
    if (displayedStatus === 'completed' || displayedStatus === 'cancelled') continue;

    const realStatus = real[name];

    if (displayedStatus === 'pending') {
      if (realStatus === 'pending') return unchanged(state, null);

      if (skipped.includes(name)) {
        return {
          state: { stages: { ...state.stages, [name]: 'completed' }, since: null },
          changed: true,
          retryDelayMs: 0,
        };
      }

      return {
        state: { stages: { ...state.stages, [name]: 'in-progress' }, since: now },
        changed: true,
        retryDelayMs: MIN_STEP_MS,
      };
    }

    // displayedStatus === 'in-progress'
    if (realStatus !== 'completed') return unchanged(state, null);

    const dwellStart = state.since ?? now;
    const remaining = dwellStart + MIN_STEP_MS - now;
    if (remaining > 0) return unchanged(state, remaining);

    return {
      state: { stages: { ...state.stages, [name]: 'completed' }, since: null },
      changed: true,
      retryDelayMs: 0,
    };
  }

  // Every stage is already displayed as completed/cancelled.
  return unchanged(state, null);
}
