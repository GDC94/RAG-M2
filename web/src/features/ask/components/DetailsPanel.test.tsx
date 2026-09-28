import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RelatedChunk } from '../schemas';
import { DetailsPanel } from './DetailsPanel';

const chunks: RelatedChunk[] = [
  {
    chunk_id: 'alba-manual::19',
    doc_id: 'alba-manual',
    version: '4.2',
    section_title: '19. Cómo solicitar vacaciones',
    score: 0.6923636198043823,
    text: 'La plantilla de Alba tiene veintidós días hábiles de vacaciones por año calendario.',
  },
  {
    chunk_id: 'alba-manual::22',
    doc_id: 'alba-manual',
    version: '4.2',
    section_title: '22. Licencias por enfermedad y licencias parentales',
    score: 0.565451443195133,
    text: 'Si la persona no puede trabajar por enfermedad, avisa a su responsable antes del inicio del turno.',
  },
];

function baseProps() {
  return {
    chunks,
    sources: ['19. Cómo solicitar vacaciones'],
    verification: null,
    timings: null,
    raw: { user_question: 'q' },
    open: false,
    onOpenChange: vi.fn(),
    highlightedChunkId: null,
  };
}

describe('DetailsPanel', () => {
  it('is collapsed by default and expands when the toggle is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<DetailsPanel {...baseProps()} onOpenChange={onOpenChange} />);

    const toggle = screen.getByRole('button', { name: /ver detalles/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/19\. cómo solicitar vacaciones/i)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);

    rerender(<DetailsPanel {...baseProps()} open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('button', { name: /ver detalles/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText(/19\. cómo solicitar vacaciones/i)).toBeInTheDocument();
  });

  it('marks the cited chunk', () => {
    render(<DetailsPanel {...baseProps()} open />);

    expect(screen.getByText('Citada')).toBeInTheDocument();
  });

  it('shows the empty state when there are no chunks', () => {
    render(<DetailsPanel {...baseProps()} open chunks={[]} />);
    expect(
      screen.getByText(/no se recuperaron fragmentos por encima del umbral/i),
    ).toBeInTheDocument();
  });

  it('formats the score with two decimals', () => {
    render(<DetailsPanel {...baseProps()} open />);

    expect(screen.getByText('0.69')).toBeInTheDocument();
    expect(screen.getByText('0.57')).toBeInTheDocument();
  });

  it('shows the verifier label and reason, or a disabled message when null', () => {
    const { rerender } = render(<DetailsPanel {...baseProps()} open />);
    expect(screen.getByText(/verificador desactivado/i)).toBeInTheDocument();

    rerender(
      <DetailsPanel
        {...baseProps()}
        open
        verification={{ label: 'supported', reason: 'La respuesta cita la sección correcta.' }}
      />,
    );
    expect(screen.getByText('Respaldada')).toBeInTheDocument();
    expect(screen.getByText(/cita la sección correcta/i)).toBeInTheDocument();
  });

  it('shows a disabled message when timings are null, and ordered bars otherwise', () => {
    const { rerender } = render(<DetailsPanel {...baseProps()} open />);
    expect(screen.getByText(/sin tiempos/i)).toBeInTheDocument();

    rerender(
      <DetailsPanel
        {...baseProps()}
        open
        timings={{ total: 900, embed: 100, search: 200, generate: 500, verify: 100, rerank: 50 }}
      />,
    );
    const labels = screen.getAllByTestId('timing-label').map((node) => node.textContent);
    expect(labels).toEqual(['embed', 'search', 'generate', 'verify', 'total', 'rerank']);
  });

  it('shows the raw JSON response', () => {
    render(<DetailsPanel {...baseProps()} open raw={{ user_question: 'q', status: 'answered' }} />);

    expect(screen.getByText(/"status": "answered"/)).toBeInTheDocument();
  });

  it('force-opens the chunk matching highlightedChunkId', () => {
    render(<DetailsPanel {...baseProps()} open highlightedChunkId="alba-manual::22" />);

    const collapsible = screen.getByTestId('chunk-text-alba-manual::22');
    expect(collapsible).toHaveAttribute('data-state', 'open');
  });
});
