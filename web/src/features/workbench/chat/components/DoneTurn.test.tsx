import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AskViewModel } from '@/features/ask/viewModel';
import { DoneTurn } from './DoneTurn';

function chunk(overrides: Partial<AskViewModel['chunks'][number]> = {}) {
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

function viewModel(overrides: Partial<AskViewModel> = {}): AskViewModel {
  const chunks = [chunk({})];
  return {
    question: '¿Cómo pido vacaciones?',
    answer: 'Pedí tus vacaciones con anticipación.',
    status: 'answered',
    isAnswered: true,
    chunks,
    citedChunks: chunks,
    verdict: null,
    timings: { stages: [], totalMs: 563 },
    docLabel: 'alba-manual@4.2',
    ...overrides,
  };
}

describe('DoneTurn', () => {
  it('shows "Trabajó N s" from the server timings, rounded to seconds', () => {
    render(
      <DoneTurn
        viewModel={viewModel({ timings: { stages: [], totalMs: 1234 } })}
        turnId="turn-1"
        clientElapsedSeconds={9}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={() => {}}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByText('Trabajó 1 s')).toBeInTheDocument();
  });

  it('falls back to the client elapsed seconds when timings are null', () => {
    render(
      <DoneTurn
        viewModel={viewModel({ timings: null, isAnswered: false, status: 'not_in_manual' })}
        turnId="turn-1"
        clientElapsedSeconds={4}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={() => {}}
        onClosePanel={() => {}}
      />,
    );

    expect(screen.getByText('Trabajó 4 s')).toBeInTheDocument();
  });

  it('renders SourcesList when answered with chunks, and hides it when not answered', () => {
    const { rerender } = render(
      <DoneTurn
        viewModel={viewModel({})}
        turnId="turn-1"
        clientElapsedSeconds={0}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={() => {}}
        onClosePanel={() => {}}
      />,
    );
    expect(screen.getByText('Fuentes')).toBeInTheDocument();

    rerender(
      <DoneTurn
        viewModel={viewModel({
          isAnswered: false,
          status: 'not_in_manual',
          chunks: [],
          citedChunks: [],
        })}
        turnId="turn-1"
        clientElapsedSeconds={0}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={() => {}}
        onClosePanel={() => {}}
      />,
    );
    expect(screen.queryByText('Fuentes')).not.toBeInTheDocument();
  });

  it('opens the detail tab for this turn when the DetailCard is clicked while closed', async () => {
    const user = userEvent.setup();
    const onOpenTab = vi.fn();
    render(
      <DoneTurn
        viewModel={viewModel({})}
        turnId="turn-1"
        clientElapsedSeconds={0}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={onOpenTab}
        onClosePanel={() => {}}
      />,
    );

    await user.click(screen.getByText('Detalle de la consulta'));

    expect(onOpenTab).toHaveBeenCalledWith('detail', 'turn-1');
  });

  it('closes the panel when the DetailCard is clicked while already open for this turn', async () => {
    const user = userEvent.setup();
    const onClosePanel = vi.fn();
    render(
      <DoneTurn
        viewModel={viewModel({})}
        turnId="turn-1"
        clientElapsedSeconds={0}
        panelOpenForThisTurn
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={() => {}}
        onClosePanel={onClosePanel}
      />,
    );

    await user.click(screen.getByText('Detalle de la consulta'));

    expect(onClosePanel).toHaveBeenCalledOnce();
  });

  it('opens the matching fragment tab when a citation marker is clicked', async () => {
    const user = userEvent.setup();
    const onOpenTab = vi.fn();
    render(
      <DoneTurn
        viewModel={viewModel({})}
        turnId="turn-1"
        clientElapsedSeconds={0}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={() => {}}
        onOpenTab={onOpenTab}
        onClosePanel={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver fragmento 1' }));

    expect(onOpenTab).toHaveBeenCalledWith('frag-0', 'turn-1');
  });
});
