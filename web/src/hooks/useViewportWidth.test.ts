import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useViewportWidth } from './useViewportWidth';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('useViewportWidth', () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    setInnerWidth(originalWidth);
  });

  it('returns the current window.innerWidth on mount', () => {
    setInnerWidth(1440);
    const { result } = renderHook(() => useViewportWidth());
    expect(result.current).toBe(1440);
  });

  it('updates when the window is resized', () => {
    setInnerWidth(1440);
    const { result } = renderHook(() => useViewportWidth());

    act(() => {
      setInnerWidth(900);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(900);
  });
});
