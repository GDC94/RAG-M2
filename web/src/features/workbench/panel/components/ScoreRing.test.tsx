import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FRAGMENT_TONES } from '@/lib/palette';
import { ScoreRing } from './ScoreRing';

describe('ScoreRing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the score centered as text', () => {
    render(<ScoreRing score={0.65} tone={FRAGMENT_TONES[0]} animKey={0} />);
    expect(screen.getByText('0.65')).toBeInTheDocument();
  });

  it('uses the tone stroke class on the progress circle', () => {
    const { container } = render(<ScoreRing score={0.65} tone={FRAGMENT_TONES[1]} animKey={0} />);
    const progress = container.querySelector('circle.stroke-accent-2');
    expect(progress).not.toBeNull();
  });

  it('starts fully unfilled and fills toward the score after the replay delay', () => {
    const { container } = render(<ScoreRing score={0.65} tone={FRAGMENT_TONES[0]} animKey={0} />);
    const progress = container.querySelectorAll('circle')[1] as SVGCircleElement;
    const circumference = 2 * Math.PI * 22;

    expect(progress.style.strokeDashoffset).toBe(String(circumference));

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(Number(progress.style.strokeDashoffset)).toBeCloseTo(circumference * (1 - 0.65), 2);
  });
});
