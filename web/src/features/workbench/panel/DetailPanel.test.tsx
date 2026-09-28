import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QueryResponse } from '@/features/ask/schemas';
import type { AskViewModel, ChunkViewModel } from '@/features/ask/viewModel';
import { DetailPanel } from './DetailPanel';

function chunk(overrides: Partial<ChunkViewModel> = {}): ChunkViewModel {
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
  const chunks = [chunk()];
  return {
    question: '¿Cómo solicito vacaciones?',
    answer: 'Vas a Inicio.',
    status: 'answered',
    isAnswered: true,
    chunks,
    citedChunks: chunks,
    verdict: null,
    timings: null,
    docLabel: 'alba-manual@4.2',
    ...overrides,
  };
}

const rawResponse: QueryResponse = {
  user_question: '¿Cómo solicito vacaciones?',
  system_answer: 'Vas a Inicio.',
  chunks_related: [],
  status: 'answered',
  sources: [],
  verification: null,
  timings: null,
};

function baseProps() {
  return {
    viewModel: viewModel(),
    rawResponse,
    tabs: ['detail'] as const,
    active: 'detail' as const,
    overflowKeys: ['frag-0', 'json'] as const,
    overflowOpen: false,
    compact: false,
    wide: false,
    animKey: 0,
    onActivateTab: vi.fn(),
    onCloseTab: vi.fn(),
    onOpenTab: vi.fn(),
    onOverflowOpenChange: vi.fn(),
    onToggleWide: vi.fn(),
    onClosePanel: vi.fn(),
  };
}

describe('DetailPanel', () => {
  it('renders the tab bar and the active detail tab', () => {
    render(<DetailPanel {...baseProps()} />);

    expect(screen.getByText('Detalle')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detalle de la consulta' })).toBeInTheDocument();
  });

  it('renders the fragment tab content when a frag- tab is active', () => {
    render(<DetailPanel {...baseProps()} tabs={['detail', 'frag-0']} active="frag-0" />);

    expect(
      screen.getByRole('heading', { name: '19. Cómo solicitar vacaciones' }),
    ).toBeInTheDocument();
  });

  it('closes a stale fragment tab whose chunk no longer exists', () => {
    const onCloseTab = vi.fn();
    render(
      <DetailPanel
        {...baseProps()}
        tabs={['detail', 'frag-5']}
        active="frag-5"
        onCloseTab={onCloseTab}
      />,
    );

    expect(onCloseTab).toHaveBeenCalledWith('frag-5');
  });

  it('renders the highlighted JSON content when the json tab is active', () => {
    render(<DetailPanel {...baseProps()} tabs={['detail', 'json']} active="json" />);

    expect(document.querySelector('pre')).not.toBeNull();
  });

  it('opens a fragment tab from the DetailTab fragment card', async () => {
    const user = userEvent.setup();
    const onOpenTab = vi.fn();
    render(<DetailPanel {...baseProps()} onOpenTab={onOpenTab} />);

    await user.click(screen.getByText('Cómo solicitar vacaciones'));
    expect(onOpenTab).toHaveBeenCalledWith('frag-0');
  });

  it('opens the json tab from the DetailTab raw-JSON row', async () => {
    const user = userEvent.setup();
    const onOpenTab = vi.fn();
    render(<DetailPanel {...baseProps()} onOpenTab={onOpenTab} />);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onOpenTab).toHaveBeenCalledWith('json');
  });

  it('closes the panel from the tab bar close button', async () => {
    const user = userEvent.setup();
    const onClosePanel = vi.fn();
    render(<DetailPanel {...baseProps()} onClosePanel={onClosePanel} />);

    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(onClosePanel).toHaveBeenCalledOnce();
  });
});
