import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('renders the Alba logo next to the "Alba RAG" name', () => {
    const { container } = render(<Wordmark />);

    expect(screen.getByText('Alba RAG')).toBeInTheDocument();
    const logo = container.querySelector('img');
    expect(logo).toHaveAttribute('src', '/alba-logo.jpg');
    // Decorative: the adjacent text already names it.
    expect(logo).toHaveAttribute('alt', '');
  });

  it('never wraps, regardless of container width', () => {
    render(<Wordmark />);

    expect(screen.getByText('Alba RAG').parentElement).toHaveClass('whitespace-nowrap');
  });
});
