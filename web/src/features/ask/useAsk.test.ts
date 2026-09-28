import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AskResult } from './api';
import type { StageEvent } from './schemas';
import { useAsk } from './useAsk';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const successResult: AskResult = {
  ok: true,
  data: {
    user_question: 'q',
    system_answer: 'answer',
    chunks_related: [],
    status: 'answered',
    sources: [],
    verification: null,
    timings: null,
  },
};

const PENDING_STAGES = {
  embed: 'pending',
  search: 'pending',
  generate: 'pending',
  verify: 'pending',
};

describe('useAsk', () => {
  it('starts a turn with every stage pending', () => {
    const ask = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('¿Cómo pido vacaciones?');
    });

    expect(result.current.turns[0]?.stages).toEqual(PENDING_STAGES);
  });

  it('goes from loading to success when the request resolves', async () => {
    const ask = vi.fn().mockResolvedValue(successResult);
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('¿Cómo pido vacaciones?');
    });

    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0]?.state).toBe('loading');
    expect(result.current.isBusy).toBe(true);

    await waitFor(() => {
      expect(result.current.turns[0]?.state).toBe('success');
    });

    expect(result.current.isBusy).toBe(false);
    const turn = result.current.turns[0];
    if (turn?.state === 'success') {
      expect(turn.response.system_answer).toBe('answer');
    }
  });

  it('advances stages to in-progress then completed as onStage fires, in order', async () => {
    const { promise, resolve } = deferred<AskResult>();
    let capturedOnStage: ((event: StageEvent) => void) | undefined;
    const ask = vi
      .fn()
      .mockImplementation((_q: string, options?: { onStage?: (e: StageEvent) => void }) => {
        capturedOnStage = options?.onStage;
        return promise;
      });
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('pregunta');
    });

    act(() => {
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'start' });
    });
    expect(result.current.turns[0]?.stages.embed).toBe('in-progress');
    expect(result.current.turns[0]?.stages.search).toBe('pending');

    act(() => {
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'end' });
      capturedOnStage?.({ type: 'stage', stage: 'search', phase: 'start' });
    });
    expect(result.current.turns[0]?.stages.embed).toBe('completed');
    expect(result.current.turns[0]?.stages.search).toBe('in-progress');

    await act(async () => {
      resolve(successResult);
      await promise;
    });
  });

  it('on success, marks stages that never ran as completed and lists them as skipped', async () => {
    const { promise, resolve } = deferred<AskResult>();
    let capturedOnStage: ((event: StageEvent) => void) | undefined;
    const ask = vi
      .fn()
      .mockImplementation((_q: string, options?: { onStage?: (e: StageEvent) => void }) => {
        capturedOnStage = options?.onStage;
        return promise;
      });
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('pregunta');
    });

    act(() => {
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'start' });
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'end' });
      capturedOnStage?.({ type: 'stage', stage: 'search', phase: 'start' });
      capturedOnStage?.({ type: 'stage', stage: 'search', phase: 'end' });
      capturedOnStage?.({ type: 'stage', stage: 'generate', phase: 'start' });
      capturedOnStage?.({ type: 'stage', stage: 'generate', phase: 'end' });
      // verify never runs
    });

    await act(async () => {
      resolve(successResult);
      await promise;
    });

    const turn = result.current.turns[0];
    expect(turn?.state).toBe('success');
    if (turn?.state === 'success') {
      expect(turn.stages.verify).toBe('completed');
      expect(turn.skipped).toEqual(['verify']);
    }
  });

  it('goes from loading to error when the request fails, cancelling the in-progress stage', async () => {
    const { promise, resolve } = deferred<AskResult>();
    let capturedOnStage: ((event: StageEvent) => void) | undefined;
    const ask = vi
      .fn()
      .mockImplementation((_q: string, options?: { onStage?: (e: StageEvent) => void }) => {
        capturedOnStage = options?.onStage;
        return promise;
      });
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('¿Cómo pido vacaciones?');
    });

    act(() => {
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'start' });
      capturedOnStage?.({ type: 'stage', stage: 'embed', phase: 'end' });
      capturedOnStage?.({ type: 'stage', stage: 'search', phase: 'start' });
    });

    await act(async () => {
      resolve({ ok: false, error: { code: 'network_error', message: 'Failed to fetch' } });
      await promise;
    });

    const turn = result.current.turns[0];
    expect(turn?.state).toBe('error');
    if (turn?.state === 'error') {
      expect(turn.error.code).toBe('network_error');
      expect(turn.stages.embed).toBe('completed');
      expect(turn.stages.search).toBe('cancelled');
      expect(turn.stages.generate).toBe('pending');
    }
    expect(result.current.isBusy).toBe(false);
  });

  it('ignores a second ask while the first is still in flight', async () => {
    const { promise, resolve } = deferred<AskResult>();
    const ask = vi.fn().mockReturnValue(promise);
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('primera pregunta');
      result.current.ask('segunda pregunta');
    });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0]?.question).toBe('primera pregunta');

    await act(async () => {
      resolve(successResult);
      await promise;
    });
  });

  it('drops an aborted result silently instead of turning it into an error turn', async () => {
    const abortedResult: AskResult = {
      ok: false,
      error: { code: 'aborted', message: 'The request was aborted' },
    };
    const ask = vi.fn().mockResolvedValue(abortedResult);
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('pregunta cancelada');
    });

    await waitFor(() => {
      expect(result.current.isBusy).toBe(false);
    });

    expect(result.current.turns).toHaveLength(0);
  });

  it('aborts the in-flight request when the hook unmounts', async () => {
    let capturedSignal: AbortSignal | undefined;
    const ask = vi
      .fn()
      .mockImplementation((_question: string, options?: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal;
        return new Promise<AskResult>(() => {});
      });
    const { result, unmount } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('pregunta que se cuelga');
    });

    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('stop() aborts the in-flight request and turns the turn into a stopped state, keeping it visible', async () => {
    let capturedSignal: AbortSignal | undefined;
    const ask = vi.fn().mockImplementation(
      (_question: string, options?: { signal?: AbortSignal }) =>
        new Promise<AskResult>((resolve) => {
          capturedSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => {
            resolve({ ok: false, error: { code: 'aborted', message: 'The request was aborted' } });
          });
        }),
    );
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.ask('pregunta que voy a detener');
    });

    act(() => {
      result.current.stop();
    });

    expect(capturedSignal?.aborted).toBe(true);

    await waitFor(() => {
      expect(result.current.turns[0]?.state).toBe('stopped');
    });
    expect(result.current.isBusy).toBe(false);
    expect(result.current.turns).toHaveLength(1);
  });

  it('stop() is a no-op when nothing is in flight', () => {
    const ask = vi.fn();
    const { result } = renderHook(() => useAsk({ ask }));

    act(() => {
      result.current.stop();
    });

    expect(ask).not.toHaveBeenCalled();
    expect(result.current.turns).toHaveLength(0);
  });
});
