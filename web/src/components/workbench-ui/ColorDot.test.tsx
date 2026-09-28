import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColorDot, ColorSquare } from './ColorDot';

describe('ColorDot', () => {
  it('applies the given solid palette class and is decorative', () => {
    const { container } = render(<ColorDot solid="bg-accent-1" />);

    const dot = container.firstElementChild;
    expect(dot?.className).toContain('bg-accent-1');
    expect(dot?.className).toContain('rounded-full');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ColorSquare', () => {
  it('applies the given solid palette class and is decorative', () => {
    const { container } = render(<ColorSquare solid="bg-tech-python" />);

    const square = container.firstElementChild;
    expect(square?.className).toContain('bg-tech-python');
    expect(square).toHaveAttribute('aria-hidden', 'true');
  });
});
