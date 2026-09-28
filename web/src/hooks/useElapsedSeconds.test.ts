import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useElapsedSeconds } from './useElapsedSeconds';

describe('useElapsedSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 0 and ticks once per second while running', () => {
    const startedAt = Date.now();
    const { result } = renderHook(() => useElapsedSeconds(startedAt, true));

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(3);
  });

  it('freezes the last value once running becomes false', () => {
    const startedAt = Date.now();
    const { result, rerender } = renderHook(
      ({ running }) => useElapsedSeconds(startedAt, running),
      { initialProps: { running: true } },
    );

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current).toBe(4);

    rerender({ running: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(4);
  });

  it('returns 0 when startedAt is null', () => {
    const { result } = renderHook(() => useElapsedSeconds(null, true));
    expect(result.current).toBe(0);
  });
});
