import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AskViewModel, ChunkViewModel } from '@/features/ask/viewModel';
import { DetailTab } from './DetailTab';

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
    cited: true,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

function viewModel(overrides: Partial<AskViewModel> = {}): AskViewModel {
  const chunks = [chunk()];
  return {
    question: '¿Cómo solicito vacaciones?',
    answer: 'Vas a Inicio, Ausencias, Solicitar ausencia.',
    status: 'answered',
    isAnswered: true,
    chunks,
    citedChunks: chunks,
    verdict: {
      key: 'supported',
      label: 'Respaldada',
      explanation: 'La respuesta cita el fragmento 19.',
    },
    timings: { stages: [{ stage: 'embed', ms: 7, startMs: 0 }], totalMs: 10 },
    docLabel: 'alba-manual@4.2',
    ...overrides,
  };
}

describe('DetailTab', () => {
  it('renders the header with the question and the verdict tag', () => {
    render(
      <DetailTab
        viewModel={viewModel()}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Detalle de la consulta' })).toBeInTheDocument();
    expect(screen.getByText('¿Cómo solicito vacaciones?')).toBeInTheDocument();
    expect(screen.getByText('Respaldada')).toBeInTheDocument();
  });

  it('shows "Sin verificar" when there is no verdict', () => {
    render(
      <DetailTab
        viewModel={viewModel({ verdict: null })}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={() => {}}
      />,
    );

    expect(screen.getByText('Sin verificar')).toBeInTheDocument();
    expect(screen.getByText('El verificador no se ejecutó.')).toBeInTheDocument();
  });

  it('shows the meta items: cited source, document and total time', () => {
    render(
      <DetailTab
        viewModel={viewModel()}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={() => {}}
      />,
    );

    expect(screen.getByText('Fuente citada')).toBeInTheDocument();
    expect(screen.getByText('Frag. 19 · Cómo solicitar vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Documento')).toBeInTheDocument();
    expect(screen.getByText('alba-manual@4.2')).toBeInTheDocument();
    expect(screen.getByText('Tiempo total')).toBeInTheDocument();
    expect(screen.getByText('10 ms')).toBeInTheDocument();
  });

  it('shows "—" as the cited source when there is nothing cited', () => {
    render(
      <DetailTab
        viewModel={viewModel({ citedChunks: [] })}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={() => {}}
      />,
    );

    const value = screen.getByText('Fuente citada').nextSibling;
    expect(value).toHaveTextContent('—');
  });

  it('renders a fragment card per retrieved chunk and calls onOpenFragment when clicked', async () => {
    const user = userEvent.setup();
    const onOpenFragment = vi.fn();
    render(
      <DetailTab
        viewModel={viewModel()}
        animKey={0}
        onOpenFragment={onOpenFragment}
        onOpenJson={() => {}}
      />,
    );

    await user.click(screen.getByText('Cómo solicitar vacaciones'));
    expect(onOpenFragment).toHaveBeenCalledWith(viewModel().chunks[0]);
  });

  it('shows an empty state when there are no retrieved chunks', () => {
    render(
      <DetailTab
        viewModel={viewModel({ chunks: [] })}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={() => {}}
      />,
    );

    expect(screen.queryByText('Cómo solicitar vacaciones')).not.toBeInTheDocument();
    expect(screen.getByText(/no se recuperó ningún fragmento/i)).toBeInTheDocument();
  });

  it('opens the JSON tab from the raw-JSON row', async () => {
    const user = userEvent.setup();
    const onOpenJson = vi.fn();
    render(
      <DetailTab
        viewModel={viewModel()}
        animKey={0}
        onOpenFragment={() => {}}
        onOpenJson={onOpenJson}
      />,
    );

    expect(screen.getByText('JSON crudo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onOpenJson).toHaveBeenCalledOnce();
  });
});
