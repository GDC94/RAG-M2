import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Turn } from '@/features/ask/useAsk';
import type { AskViewModel } from '@/features/ask/viewModel';
import { ChatColumn, type ChatColumnProps } from './ChatColumn';

const stages = {
  embed: 'completed' as const,
  search: 'completed' as const,
  generate: 'completed' as const,
  verify: 'completed' as const,
};

const successTurn: Turn = {
  id: 'turn-1',
  question: '¿Cómo pido vacaciones?',
  state: 'success',
  stages,
  response: {
    user_question: '¿Cómo pido vacaciones?',
    system_answer: 'Pedí tus vacaciones con anticipación.',
    chunks_related: [],
    status: 'answered',
    sources: [],
    verification: null,
    timings: { total: 0.5 },
  },
  skipped: [],
};

const viewModel: AskViewModel = {
  question: '¿Cómo pido vacaciones?',
  answer: 'Pedí tus vacaciones con anticipación.',
  status: 'answered',
  isAnswered: true,
  chunks: [],
  citedChunks: [],
  verdict: null,
  timings: { stages: [], totalMs: 500 },
  docLabel: null,
};

function baseProps(overrides: Partial<ChatColumnProps> = {}): ChatColumnProps {
  return {
    turns: [],
    viewModels: new Map(),
    isBusy: false,
    input: '',
    onInputChange: vi.fn(),
    maxInputLength: 1000,
    onSubmit: vi.fn(),
    onStop: vi.fn(),
    sidebarHidden: false,
    onShowSidebar: vi.fn(),
    panelOpen: false,
    focusedTurnId: null,
    citationsOpen: true,
    onCitationsOpenChange: vi.fn(),
    onOpenTab: vi.fn(),
    onOpenPanel: vi.fn(),
    onClosePanel: vi.fn(),
    ...overrides,
  };
}

describe('ChatColumn', () => {
  it('renders each turn and the composer', () => {
    render(
      <ChatColumn
        {...baseProps({ turns: [successTurn], viewModels: new Map([[successTurn.id, viewModel]]) })}
      />,
    );

    expect(screen.getByText('¿Cómo pido vacaciones?')).toBeInTheDocument();
    expect(screen.getByText('Pedí tus vacaciones con anticipación.')).toBeInTheDocument();
    expect(screen.getByLabelText('Escribí tu pregunta')).toBeInTheDocument();
  });

  it('shows the "open detail panel" header button when the latest turn has a response and the panel is closed', async () => {
    const user = userEvent.setup();
    const onOpenPanel = vi.fn();
    render(
      <ChatColumn
        {...baseProps({
          turns: [successTurn],
          viewModels: new Map([[successTurn.id, viewModel]]),
          onOpenPanel,
        })}
      />,
    );

    const button = screen.getByRole('button', { name: 'Abrir panel de detalle' });
    await user.click(button);
    expect(onOpenPanel).toHaveBeenCalledWith('turn-1');
  });

  it('hides the "open detail panel" button once the panel is open', () => {
    render(
      <ChatColumn
        {...baseProps({
          turns: [successTurn],
          viewModels: new Map([[successTurn.id, viewModel]]),
          panelOpen: true,
        })}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Abrir panel de detalle' }),
    ).not.toBeInTheDocument();
  });

  it('hides the example chips while busy', () => {
    const { rerender } = render(<ChatColumn {...baseProps()} />);
    expect(screen.getByText('¿Qué día se paga la nómina?')).toBeInTheDocument();

    rerender(<ChatColumn {...baseProps({ isBusy: true })} />);
    expect(screen.queryByText('¿Qué día se paga la nómina?')).not.toBeInTheDocument();
  });

  it('fills the input and focuses it when an example chip is clicked, without submitting', async () => {
    const user = userEvent.setup();
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    render(<ChatColumn {...baseProps({ onInputChange, onSubmit })} />);

    await user.click(screen.getByRole('button', { name: '¿Qué día se paga la nómina?' }));

    expect(onInputChange).toHaveBeenCalledWith('¿Qué día se paga la nómina?');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Escribí tu pregunta')).toHaveFocus();
  });
});
