import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { DetailCard } from './DetailCard';

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

describe('DetailCard', () => {
  it('shows the title, "Sin verificar" when there is no verdict, and the fragment/timing summary', () => {
    render(
      <DetailCard
        chunks={[chunk({})]}
        verdict={null}
        totalMs={563}
        open={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText('Detalle de la consulta')).toBeInTheDocument();
    expect(screen.getByText('Sin verificar')).toBeInTheDocument();
    expect(screen.getByText('Frag. 19')).toBeInTheDocument();
    expect(screen.getByText('563 ms')).toBeInTheDocument();
  });

  it('shows the verdict label when present', () => {
    render(
      <DetailCard
        chunks={[chunk({})]}
        verdict={{ key: 'supported', label: 'Respaldada', explanation: 'ok' }}
        totalMs={563}
        open={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText('Respaldada')).toBeInTheDocument();
    expect(screen.queryByText('Sin verificar')).not.toBeInTheDocument();
  });

  it('is a single button that shows "Abrir" when closed and calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DetailCard
        chunks={[chunk({})]}
        verdict={null}
        totalMs={563}
        open={false}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Abrir');
    expect(screen.queryByRole('button', { name: /cerrar/i })).not.toBeInTheDocument();

    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows "Cerrar" when open for this turn', () => {
    render(
      <DetailCard chunks={[chunk({})]} verdict={null} totalMs={563} open onToggle={() => {}} />,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Cerrar');
  });

  it('shows a dash for total time when timings are unavailable', () => {
    render(
      <DetailCard chunks={[]} verdict={null} totalMs={null} open={false} onToggle={() => {}} />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
