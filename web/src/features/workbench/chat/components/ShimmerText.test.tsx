import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useReducedMotionMock = vi.fn(() => false);
vi.mock('motion/react', () => ({
  useReducedMotion: () => useReducedMotionMock(),
}));

describe('ShimmerText', () => {
  it('renders the shimmer classes by default', async () => {
    useReducedMotionMock.mockReturnValue(false);
    const { ShimmerText } = await import('./ShimmerText');

    render(<ShimmerText>Trabajando 3 s</ShimmerText>);

    const node = screen.getByText('Trabajando 3 s');
    expect(node.className).toContain('bg-shimmer');
    expect(node.className).toContain('animate-shimmer');
    expect(node.className).toContain('bg-clip-text');
    expect(node.className).toContain('text-transparent');
  });

  it('falls back to plain muted text when reduced motion is preferred', async () => {
    useReducedMotionMock.mockReturnValue(true);
    const { ShimmerText } = await import('./ShimmerText');

    render(<ShimmerText>Trabajando 3 s</ShimmerText>);

    const node = screen.getByText('Trabajando 3 s');
    expect(node.className).not.toContain('animate-shimmer');
    expect(node.className).toContain('text-fg-muted');
  });
});
