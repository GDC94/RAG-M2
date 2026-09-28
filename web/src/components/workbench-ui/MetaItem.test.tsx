import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetaItem } from './MetaItem';

describe('MetaItem', () => {
  it('renders the label over the value', () => {
    render(<MetaItem label="Doc" value="alba-manual@4.2" />);

    expect(screen.getByText('Doc')).toBeInTheDocument();
    expect(screen.getByText('alba-manual@4.2')).toBeInTheDocument();
  });

  it('gives the label the faint tone and the value the base size', () => {
    render(<MetaItem label="Doc" value="alba-manual@4.2" />);

    expect(screen.getByText('Doc').className).toContain('text-fg-faint');
    expect(screen.getByText('alba-manual@4.2').className).toContain('text-base');
  });
});
