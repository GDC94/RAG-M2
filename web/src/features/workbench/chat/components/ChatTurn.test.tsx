import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Turn } from '@/features/ask/useAsk';
import type { AskViewModel } from '@/features/ask/viewModel';
import { MIN_STEP_MS } from '../pacing';
import { ChatTurn } from './ChatTurn';

const stages = {
  embed: 'in-progress' as const,
  search: 'pending' as const,
  generate: 'pending' as const,
  verify: 'pending' as const,
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

const noop = () => {};

describe('ChatTurn', () => {
  it('shows the question bubble and the working timeline while loading', () => {
    const turn: Turn = { id: 't1', question: '¿Cómo pido vacaciones?', state: 'loading', stages };

    render(
      <ChatTurn
        turn={turn}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={noop}
        onOpenTab={noop}
        onClosePanel={noop}
      />,
    );

    expect(screen.getByText('¿Cómo pido vacaciones?')).toBeInTheDocument();
    expect(screen.getByText('Ejecutando 4 pasos')).toBeInTheDocument();
  });

  it('shows the answer once the turn succeeds', () => {
    const turn: Turn = {
      id: 't1',
      question: '¿Cómo pido vacaciones?',
      state: 'success',
      stages: {
        embed: 'completed',
        search: 'completed',
        generate: 'completed',
        verify: 'completed',
      },
      response: {
        user_question: '¿Cómo pido vacaciones?',
        system_answer: 'Pedí tus vacaciones con anticipación.',
        chunks_related: [],
        status: 'answered',
        sources: [],
        verification: null,
        timings: null,
      },
      skipped: [],
    };

    render(
      <ChatTurn
        turn={turn}
        viewModel={viewModel}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={noop}
        onOpenTab={noop}
        onClosePanel={noop}
      />,
    );

    expect(screen.getByText('Pedí tus vacaciones con anticipación.')).toBeInTheDocument();
  });

  it('shows the error message for an error turn', () => {
    const turn: Turn = {
      id: 't1',
      question: 'q',
      state: 'error',
      stages,
      error: { code: 'provider_error', message: 'boom' },
    };

    render(
      <ChatTurn
        turn={turn}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={noop}
        onOpenTab={noop}
        onClosePanel={noop}
      />,
    );

    expect(screen.getByText('El proveedor del modelo devolvió un error.')).toBeInTheDocument();
  });

  it('shows the stopped message for a stopped turn', () => {
    const turn: Turn = { id: 't1', question: 'q', state: 'stopped', stages };

    render(
      <ChatTurn
        turn={turn}
        panelOpenForThisTurn={false}
        citationsOpen
        onCitationsOpenChange={noop}
        onOpenTab={noop}
        onClosePanel={noop}
      />,
    );

    expect(screen.getByText('Consulta detenida.')).toBeInTheDocument();
  });
});

describe('ChatTurn pacing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps showing a stage batched straight to completed as running, and only reveals the answer once pacing settles', () => {
    const loadingTurn: Turn = {
      id: 't1',
      question: 'q',
      state: 'loading',
      stages: { embed: 'completed', search: 'pending', generate: 'pending', verify: 'pending' },
    };
    const props = {
      panelOpenForThisTurn: false,
      citationsOpen: true,
      onCitationsOpenChange: noop,
      onOpenTab: noop,
      onClosePanel: noop,
    };

    const { rerender } = render(<ChatTurn turn={loadingTurn} {...props} />);

    // The NDJSON stream delivers search's start+end batched into a single
    // render while still loading: real jumps straight from 'pending' to
    // 'completed', with no intermediate 'in-progress' ever observed.
    const batchedTurn: Turn = {
      ...loadingTurn,
      stages: { ...loadingTurn.stages, search: 'completed' },
    };
    rerender(<ChatTurn turn={batchedTurn} {...props} />);

    const searchRow = screen.getByText('Buscando en el manual').closest('div');
    expect(searchRow?.className).toContain('text-fg-strong');

    // The result then arrives: the turn resolves to 'success', folding
    // generate and verify into 'completed' as skipped (never finished).
    const successTurn: Turn = {
      id: 't1',
      question: 'q',
      state: 'success',
      stages: {
        embed: 'completed',
        search: 'completed',
        generate: 'completed',
        verify: 'completed',
      },
      response: {
        user_question: 'q',
        system_answer: viewModel.answer,
        chunks_related: [],
        status: 'answered',
        sources: [],
        verification: null,
        timings: null,
      },
      skipped: ['generate', 'verify'],
    };
    rerender(<ChatTurn turn={successTurn} viewModel={viewModel} {...props} />);

    // The answer isn't shown yet: search is still dwelling as 'in-progress'.
    expect(screen.queryByText(viewModel.answer)).not.toBeInTheDocument();
    expect(screen.getByText('Buscando en el manual')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MIN_STEP_MS);
    });

    expect(screen.getByText(viewModel.answer)).toBeInTheDocument();
    expect(screen.queryByText('Buscando en el manual')).not.toBeInTheDocument();
  });
});
