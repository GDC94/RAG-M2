import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StageName } from '@/features/ask/schemas';
import type { TurnStages } from '@/features/ask/useAsk';
import { MIN_STEP_MS } from '@/features/workbench/chat/pacing';
import { usePacedStages } from './usePacedStages';

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

describe('usePacedStages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a stage in-progress for at least MIN_STEP_MS before completing it, even when real jumps straight to completed', () => {
    const { result, rerender } = renderHook(({ real }) => usePacedStages(real, NO_SKIP), {
      initialProps: { real: stages() },
    });

    // embed already reports 'completed' in real, but the display must still
    // dwell on 'in-progress' first.
    rerender({ real: stages({ embed: 'completed' }) });
    expect(result.current.stages.embed).toBe('in-progress');

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });
    expect(result.current.stages.embed).toBe('completed');

    // ...then the NDJSON stream delivers search's start+end in the same
    // batched render: real is already 'completed' with no intermediate
    // 'in-progress' ever having been observed.
    rerender({ real: stages({ embed: 'completed', search: 'completed' }) });

    expect(result.current.stages.search).toBe('in-progress');
    expect(result.current.settled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS - 1);
    });
    expect(result.current.stages.search).toBe('in-progress');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.stages.search).toBe('completed');
    expect(result.current.settled).toBe(true);
  });

  it('never shows a stage ahead of real', () => {
    const { result, rerender } = renderHook(({ real }) => usePacedStages(real, NO_SKIP), {
      initialProps: { real: stages() },
    });

    rerender({ real: stages({ embed: 'in-progress' }) });
    expect(result.current.stages.embed).toBe('in-progress');
    expect(result.current.stages.search).toBe('pending');

    // real never progresses past embed; nothing else should ever appear,
    // no matter how much time passes.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.stages.embed).toBe('in-progress');
    expect(result.current.stages.search).toBe('pending');
  });

  it('applies a cancellation immediately and settles', () => {
    const { result, rerender } = renderHook(({ real }) => usePacedStages(real, NO_SKIP), {
      initialProps: { real: stages({ embed: 'in-progress' }) },
    });

    rerender({ real: stages({ embed: 'cancelled' }) });

    expect(result.current.stages.embed).toBe('cancelled');
    expect(result.current.settled).toBe(true);
  });

  it('advances four simultaneously completed real stages one by one through the dwell sequence', () => {
    const allCompleted = stages({
      embed: 'completed',
      search: 'completed',
      generate: 'completed',
      verify: 'completed',
    });
    const { result, rerender } = renderHook(({ real }) => usePacedStages(real, NO_SKIP), {
      initialProps: { real: stages() },
    });

    rerender({ real: allCompleted });
    expect(result.current.stages.embed).toBe('in-progress');
    expect(result.current.settled).toBe(false);

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });
    expect(result.current.stages.embed).toBe('completed');
    expect(result.current.stages.search).toBe('in-progress');

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });
    expect(result.current.stages.search).toBe('completed');
    expect(result.current.stages.generate).toBe('in-progress');

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });
    expect(result.current.stages.generate).toBe('completed');
    expect(result.current.stages.verify).toBe('in-progress');

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });
    expect(result.current.stages.verify).toBe('completed');
    expect(result.current.settled).toBe(true);
  });

  it('completes a skipped stage without any dwell', () => {
    const real = stages({
      embed: 'completed',
      search: 'completed',
      generate: 'completed',
      verify: 'completed',
    });
    const { result, rerender } = renderHook(({ real, skipped }) => usePacedStages(real, skipped), {
      initialProps: { real: stages(), skipped: [] as readonly StageName[] },
    });

    rerender({ real, skipped: ['verify'] });

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS * 3);
    });
    // embed, search and generate went through their dwell sequence; the
    // moment generate completes, skipped verify jumps straight to completed
    // in the same tick, with no dwell of its own.
    expect(result.current.stages.generate).toBe('completed');
    expect(result.current.stages.verify).toBe('completed');
    expect(result.current.settled).toBe(true);
  });

  it('cleans up its timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ real }) => usePacedStages(real, NO_SKIP), {
      initialProps: { real: stages() },
    });

    rerender({ real: stages({ embed: 'in-progress' }) });
    unmount();

    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow();
  });
});
