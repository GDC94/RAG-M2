import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RepoButton } from './RepoButton';

describe('RepoButton', () => {
  it('links to the repo in a new tab, safely', () => {
    render(<RepoButton />);

    const link = screen.getByRole('link', { name: /rag-m2/i });
    expect(link).toHaveAttribute('href', 'https://github.com/GDC94/RAG-M2');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('never wraps its label', () => {
    render(<RepoButton />);

    expect(screen.getByRole('link', { name: /rag-m2/i })).toHaveClass('whitespace-nowrap');
  });

  it('shows the GitHub mark idle, and swaps to a star on hover', async () => {
    const user = userEvent.setup();
    render(<RepoButton />);

    expect(screen.getByTestId('repo-icon-github')).toBeInTheDocument();
    expect(screen.queryByTestId('repo-icon-star')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('link', { name: /rag-m2/i }));

    await waitFor(() => {
      expect(screen.getByTestId('repo-icon-star')).toBeInTheDocument();
    });
  });
});
