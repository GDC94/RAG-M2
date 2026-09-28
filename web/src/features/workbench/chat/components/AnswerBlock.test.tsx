import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { AnswerBlock } from './AnswerBlock';

function chunk(overrides: Partial<ChunkViewModel>): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.69,
    body: 'body',
    preview: 'preview',
    cited: true,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

describe('AnswerBlock', () => {
  it('renders the answer text and one Citation marker per cited chunk, numbered by citation order', async () => {
    const user = userEvent.setup();
    const onCiteClick = vi.fn();
    const cited = [chunk({ id: 'a', tone: 2 }), chunk({ id: 'b', tone: 0 })];

    render(
      <AnswerBlock
        answer="Pedí tus vacaciones con anticipación."
        status="answered"
        isAnswered
        citedChunks={cited}
        onCiteClick={onCiteClick}
      />,
    );

    expect(screen.getByText(/Pedí tus vacaciones/)).toBeInTheDocument();
    const first = screen.getByRole('button', { name: 'Ver fragmento 1' });
    const second = screen.getByRole('button', { name: 'Ver fragmento 2' });
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();

    await user.click(second);
    expect(onCiteClick).toHaveBeenCalledWith(cited[1]);
  });

  it('shows no citations and a "Fuera del manual" tag when not_in_manual', () => {
    render(
      <AnswerBlock
        answer="No encuentro esa información en el manual."
        status="not_in_manual"
        isAnswered={false}
        citedChunks={[]}
        onCiteClick={() => {}}
      />,
    );

    expect(screen.getByText('Fuera del manual')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver fragmento/ })).not.toBeInTheDocument();
  });

  it('shows "Política de clientes" when client_policy', () => {
    render(
      <AnswerBlock
        answer="No puedo compartir eso."
        status="client_policy"
        isAnswered={false}
        citedChunks={[]}
        onCiteClick={() => {}}
      />,
    );

    expect(screen.getByText('Política de clientes')).toBeInTheDocument();
  });
});
