import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonoValue } from './MonoValue';

describe('MonoValue', () => {
  it('renders its children in a monospace, small font', () => {
    render(<MonoValue>412 ms</MonoValue>);

    const value = screen.getByText('412 ms');
    expect(value.className).toContain('font-mono');
    expect(value.className).toContain('text-xs');
  });

  it('applies an optional tone class on top of the defaults', () => {
    render(<MonoValue tone="text-json-number">42</MonoValue>);

    expect(screen.getByText('42').className).toContain('text-json-number');
  });
});
