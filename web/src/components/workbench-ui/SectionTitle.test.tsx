import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionTitle } from './SectionTitle';

describe('SectionTitle', () => {
  it('renders as a heading by default', () => {
    render(<SectionTitle>Fragmentos</SectionTitle>);

    expect(screen.getByRole('heading', { name: 'Fragmentos' })).toBeInTheDocument();
  });

  it('applies the base/medium text style', () => {
    render(<SectionTitle>Fragmentos</SectionTitle>);

    expect(screen.getByRole('heading', { name: 'Fragmentos' }).className).toContain('font-medium');
  });

  it('renders the requested heading level', () => {
    render(<SectionTitle as="h4">Fragmentos</SectionTitle>);

    const heading = screen.getByRole('heading', { name: 'Fragmentos' });
    expect(heading.tagName).toBe('H4');
  });
});
