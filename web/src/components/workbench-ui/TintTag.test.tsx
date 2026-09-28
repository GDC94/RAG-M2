import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TintTag } from './TintTag';

describe('TintTag', () => {
  it('renders its children and applies the given tone classes plus a border', () => {
    render(<TintTag tone="bg-accent-1/12 border-accent-1/30 text-accent-1">Frag. 19</TintTag>);

    const tag = screen.getByText('Frag. 19');
    expect(tag.className).toContain('bg-accent-1/12');
    expect(tag.className).toContain('border-accent-1/30');
    expect(tag.className).toContain('text-accent-1');
    expect(tag.className).toContain('border');
  });

  it('defaults to the sm size', () => {
    render(<TintTag tone="text-accent-1">Frag. 19</TintTag>);

    expect(screen.getByText('Frag. 19').className).toContain('h-[26px]');
  });

  it('applies the xs size for inline tags', () => {
    render(
      <TintTag tone="text-accent-1" size="xs">
        Citada
      </TintTag>,
    );

    expect(screen.getByText('Citada').className).toContain('text-xs');
  });
});
