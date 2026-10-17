import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CachedBadge } from './CachedBadge';

describe('CachedBadge', () => {
  it('labels the answer as served from cache', () => {
    render(<CachedBadge />);

    expect(screen.getByText('Desde caché')).toBeInTheDocument();
  });

  it('explains on hover that the provider was not called again', () => {
    render(<CachedBadge />);

    expect(screen.getByTitle(/no se volvió a consultar/i)).toContainElement(
      screen.getByText('Desde caché'),
    );
  });
});
