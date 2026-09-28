import { describe, expect, it } from 'vitest';
import type { StageName } from '@/features/ask/schemas';
import type { TurnStages } from '@/features/ask/useAsk';
import { advance, initialState, isSettled, MIN_STEP_MS } from './pacing';

function stages(overrides: Partial<TurnStages> = {}): TurnStages {
  return {
    embed: 'pending',
    search: 'pending',
    generate: 'pending',
    verify: 'pending',
    ...overrides,
  };
}

const NO_SKIP: readonly StageName[] = [];

describe('isSettled', () => {
  it('is true when displayed equals real', () => {
    expect(isSettled(stages({ embed: 'completed' }), stages({ embed: 'completed' }))).toBe(true);
  });

  it('is false when displayed differs from real', () => {
    expect(isSettled(stages({ embed: 'pending' }), stages({ embed: 'in-progress' }))).toBe(false);
  });
});

describe('advance', () => {
  it('shows the first stage in-progress once real starts it, and schedules the dwell retry', () => {
    const state = initialState(stages());
    const real = stages({ embed: 'in-progress' });

    const result = advance(state, real, NO_SKIP, 1000);

    expect(result.changed).toBe(true);
    expect(result.state.stages.embed).toBe('in-progress');
    expect(result.retryDelayMs).toBe(MIN_STEP_MS);
  });

  it('holds an in-progress stage completed until the dwell elapses, even if real already completed it', () => {
    const state: ReturnType<typeof initialState> = {
      stages: stages({ embed: 'in-progress' }),
      since: 1000,
    };
    const real = stages({ embed: 'completed' });

    const tooEarly = advance(state, real, NO_SKIP, 1200);
    expect(tooEarly.changed).toBe(false);
    expect(tooEarly.retryDelayMs).toBe(200);

    const afterDwell = advance(state, real, NO_SKIP, 1400);
    expect(afterDwell.changed).toBe(true);
    expect(afterDwell.state.stages.embed).toBe('completed');
    // search is still 'pending' in real, so there's nothing left to cascade
    // into right now — the caller should wait for `real` to change.
    expect(afterDwell.retryDelayMs).toBeNull();
  });

  it('jumps a skipped stage straight to completed with no dwell', () => {
    const state = initialState(
      stages({ embed: 'completed', search: 'completed', generate: 'completed' }),
    );
    const real = stages({
      embed: 'completed',
      search: 'completed',
      generate: 'completed',
      verify: 'completed',
    });

    const result = advance(state, real, ['verify'], 5000);

    expect(result.changed).toBe(true);
    expect(result.state.stages.verify).toBe('completed');
    // verify is the last stage — once it lands, everything is settled.
    expect(result.retryDelayMs).toBeNull();
  });

  it('cascades an in-progress stage completing straight into the next stage starting, in one call', () => {
    const state: ReturnType<typeof initialState> = {
      stages: stages({ embed: 'in-progress' }),
      since: 1000,
    };
    const real = stages({ embed: 'completed', search: 'completed' });

    const result = advance(state, real, NO_SKIP, 1400);

    expect(result.state.stages.embed).toBe('completed');
    expect(result.state.stages.search).toBe('in-progress');
    expect(result.retryDelayMs).toBe(MIN_STEP_MS);
  });

  it('does not advance a later stage until the earlier one is displayed completed', () => {
    const state = initialState(stages({ embed: 'in-progress' }));
    const real = stages({ embed: 'completed', search: 'in-progress' });

    const result = advance(state, real, NO_SKIP, 2000);

    // embed's dwell just started (since defaults to `now` at initialState
    // time via the test setup below), so the earliest possible transition
    // is embed -> completed, not search -> in-progress.
    expect(result.state.stages.search).toBe('pending');
  });

  it('snaps everything to real immediately when a stage is cancelled', () => {
    const state = initialState(stages({ embed: 'completed', search: 'in-progress' }));
    const real = stages({ embed: 'completed', search: 'cancelled' });

    const result = advance(state, real, NO_SKIP, 3000);

    expect(result.changed).toBe(true);
    expect(result.state.stages).toEqual(real);
    expect(result.retryDelayMs).toBeNull();
    expect(isSettled(result.state.stages, real)).toBe(true);
  });

  it('reports no change and no retry once fully settled', () => {
    const real = stages({
      embed: 'completed',
      search: 'completed',
      generate: 'completed',
      verify: 'completed',
    });
    const state = initialState(real);

    const result = advance(state, real, NO_SKIP, 9999);

    expect(result.changed).toBe(false);
    expect(result.retryDelayMs).toBeNull();
  });
});
