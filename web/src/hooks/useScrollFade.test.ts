import { act, renderHook } from '@testing-library/react';
import type { UIEvent } from 'react';
import { describe, expect, it } from 'vitest';
import { scrollEdges, useScrollFade } from './useScrollFade';

function metrics(scrollTop: number, scrollHeight = 1000, clientHeight = 400) {
  return { scrollTop, scrollHeight, clientHeight };
}

describe('scrollEdges', () => {
  it('reports no hidden content when everything fits', () => {
    expect(scrollEdges(metrics(0, 300, 400))).toEqual({ top: false, bottom: false });
  });

  it('reports hidden content below only, at the top', () => {
    expect(scrollEdges(metrics(0))).toEqual({ top: false, bottom: true });
  });

  it('reports hidden content on both sides mid-scroll', () => {
    expect(scrollEdges(metrics(300))).toEqual({ top: true, bottom: true });
  });

  it('reports hidden content above only, at the bottom (tolerating sub-pixel rounding)', () => {
    expect(scrollEdges(metrics(599.5))).toEqual({ top: true, bottom: false });
  });
});

describe('useScrollFade', () => {
  it('starts without fades and updates them from scroll events', () => {
    const { result } = renderHook(() => useScrollFade());
    expect(result.current).toMatchObject({ fadeTop: false, fadeBottom: false });

    act(() => {
      result.current.onScroll({ currentTarget: metrics(300) } as unknown as UIEvent<HTMLElement>);
    });

    expect(result.current).toMatchObject({ fadeTop: true, fadeBottom: true });
  });
});
