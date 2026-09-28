import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { FragmentCard } from './FragmentCard';

function chunk(overrides: Partial<ChunkViewModel> = {}): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.69,
    body: 'body',
    preview: 'Primera línea del fragmento.',
    cited: false,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

describe('FragmentCard', () => {
  it('renders the fragment number, title and preview', () => {
    render(<FragmentCard chunk={chunk()} animKey={0} onClick={() => {}} />);

    expect(screen.getByText('Frag. 19')).toBeInTheDocument();
    expect(screen.getByText('Cómo solicitar vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Primera línea del fragmento.')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Ver fragmento completo →')).toBeInTheDocument();
  });

  it('shows a "Citada" tag only when the chunk is cited', () => {
    const { rerender } = render(
      <FragmentCard chunk={chunk({ cited: false })} animKey={0} onClick={() => {}} />,
    );
    expect(screen.queryByText('Citada')).not.toBeInTheDocument();

    rerender(<FragmentCard chunk={chunk({ cited: true })} animKey={0} onClick={() => {}} />);
    expect(screen.getByText('Citada')).toBeInTheDocument();
  });

  it('is a single button that calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FragmentCard chunk={chunk()} animKey={0} onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
