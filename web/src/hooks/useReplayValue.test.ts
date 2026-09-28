import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `useReducedMotion` reads `window.matchMedia` once, via a module-level
// listener set up on first import — overriding `window.matchMedia` inside a
// test runs too late to affect it. Mock the hook directly instead, behind a
// flag the "reduced motion" test flips before rendering (see
// `components/common/ClickSpark.test.tsx`).
let reducedMotionOverride = false;
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotionOverride };
});

const { useReplayValue } = await import('./useReplayValue');

describe('useReplayValue', () => {
  beforeEach(() => {
    reducedMotionOverride = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 0 and reaches the target after the delay', () => {
    const { result } = renderHook(() => useReplayValue(0.65, 0));

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(0.65);
  });

  it('uses a custom delay when given', () => {
    const { result } = renderHook(() => useReplayValue(0.65, 0, 100));

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(0.65);
  });

  it('resets to 0 then replays to the target when animKey changes', () => {
    const { result, rerender } = renderHook(({ animKey }) => useReplayValue(0.65, animKey), {
      initialProps: { animKey: 0 },
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(0.65);

    rerender({ animKey: 1 });
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current).toBe(0.65);
  });

  it('jumps straight to the target with no delay when reduced motion is on', () => {
    reducedMotionOverride = true;
    const { result } = renderHook(() => useReplayValue(0.65, 0));

    expect(result.current).toBe(0.65);
  });
});
