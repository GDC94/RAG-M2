import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimingsViewModel } from '@/features/ask/viewModel';
import { TimingsGantt } from './TimingsGantt';

const timings: TimingsViewModel = {
  stages: [
    { stage: 'embed', ms: 10, startMs: 0 },
    { stage: 'search', ms: 20, startMs: 10 },
    { stage: 'generate', ms: 300, startMs: 30 },
    { stage: 'verify', ms: 40, startMs: 330 },
  ],
  totalMs: 370,
};

describe('TimingsGantt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one labeled row per stage with its ms value', () => {
    render(<TimingsGantt timings={timings} animKey={0} />);

    expect(screen.getByText('Embedding')).toBeInTheDocument();
    expect(screen.getByText('Búsqueda')).toBeInTheDocument();
    expect(screen.getByText('Generación')).toBeInTheDocument();
    expect(screen.getByText('Verificación')).toBeInTheDocument();
    expect(screen.getByText('10 ms')).toBeInTheDocument();
    expect(screen.getByText('300 ms')).toBeInTheDocument();
  });

  it('renders an empty state when timings is null', () => {
    render(<TimingsGantt timings={null} animKey={0} />);

    expect(screen.queryByText('Embedding')).not.toBeInTheDocument();
    expect(screen.getByText(/sin datos de tiempos/i)).toBeInTheDocument();
  });

  it('positions each bar by its cumulative start offset', () => {
    const { container } = render(<TimingsGantt timings={timings} animKey={0} />);
    const bars = container.querySelectorAll('[data-testid="gantt-bar"]');

    expect(bars).toHaveLength(4);
    // generate starts at 30/370 of the total
    expect((bars[2] as HTMLElement).style.left).toBe(`${(30 / 370) * 100}%`);
  });

  it('animates each bar width from 0 toward its share of the total after the replay delay', () => {
    const { container } = render(<TimingsGantt timings={timings} animKey={0} />);
    const bars = container.querySelectorAll('[data-testid="gantt-bar"]');

    expect((bars[2] as HTMLElement).style.width).toBe('0%');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect((bars[2] as HTMLElement).style.width).toBe(`${(300 / 370) * 100}%`);
  });
});
