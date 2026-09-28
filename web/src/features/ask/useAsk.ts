import { useCallback, useEffect, useRef, useState } from 'react';
import { type AskResult, askQuestionStream } from './api';
import { type QueryResponse, STAGE_NAMES, type StageEvent, type StageName } from './schemas';

export type StageStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type TurnStages = Record<StageName, StageStatus>;

interface BaseTurn {
  id: string;
  question: string;
  stages: TurnStages;
}

export type Turn =
  | (BaseTurn & { state: 'loading' })
  | (BaseTurn & { state: 'success'; response: QueryResponse; skipped: StageName[] })
  | (BaseTurn & { state: 'error'; error: { code: string; message: string } })
  | (BaseTurn & { state: 'stopped' });

export interface UseAskOptions {
  /** Injectable for tests; defaults to the real `askQuestionStream`. */
  ask?: typeof askQuestionStream;
}

export interface UseAskResult {
  turns: Turn[];
  ask: (question: string) => void;
  isBusy: boolean;
  /** Aborts the in-flight request, turning its turn into a `stopped` state
   * instead of dropping it (unlike the silent abort on unmount). No-op when
   * nothing is in flight. */
  stop: () => void;
}

function initialStages(): TurnStages {
  return Object.fromEntries(STAGE_NAMES.map((name) => [name, 'pending'])) as TurnStages;
}

function applyStageEvent(stages: TurnStages, event: StageEvent): TurnStages {
  return { ...stages, [event.stage]: event.phase === 'start' ? 'in-progress' : 'completed' };
}

/** Any stage that never reached `completed` (never ran, or started but never
 * finished) is folded into `completed` and reported as skipped. */
function finalizeOnSuccess(stages: TurnStages): { stages: TurnStages; skipped: StageName[] } {
  const skipped: StageName[] = [];
  const next = { ...stages };
  for (const name of STAGE_NAMES) {
    if (next[name] !== 'completed') {
      skipped.push(name);
      next[name] = 'completed';
    }
  }
  return { stages: next, skipped };
}

/** The stage that was running when the request failed/stopped becomes
 * `cancelled`; stages that hadn't started stay `pending`. */
function finalizeOnFailure(stages: TurnStages): TurnStages {
  const next = { ...stages };
  for (const name of STAGE_NAMES) {
    if (next[name] === 'in-progress') next[name] = 'cancelled';
  }
  return next;
}

/**
 * Drives a single stateless question/answer conversation kept only in memory.
 * A new submission is ignored while one is already in flight. The in-flight
 * request is aborted on unmount (its result dropped silently) or via `stop()`
 * (its turn becomes a visible `stopped` state instead).
 */
export function useAsk(options?: UseAskOptions): UseAskResult {
  const ask = options?.ask ?? askQuestionStream;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const isBusyRef = useRef(false);
  const idCounterRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const stagesRef = useRef<TurnStages>(initialStages());

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const submit = useCallback(
    (question: string) => {
      if (isBusyRef.current) return;

      idCounterRef.current += 1;
      const id = `turn-${idCounterRef.current}`;
      const controller = new AbortController();
      controllerRef.current = controller;
      stoppedRef.current = false;
      stagesRef.current = initialStages();

      isBusyRef.current = true;
      setIsBusy(true);
      setTurns((previous) => [
        ...previous,
        { id, question, state: 'loading', stages: stagesRef.current },
      ]);

      const onStage = (event: StageEvent) => {
        stagesRef.current = applyStageEvent(stagesRef.current, event);
        const stages = stagesRef.current;
        setTurns((previous) =>
          previous.map((turn) => (turn.id === id ? { ...turn, stages } : turn)),
        );
      };

      void ask(question, { signal: controller.signal, onStage }).then((result: AskResult) => {
        if (!result.ok && result.error.code === 'aborted') {
          if (stoppedRef.current) {
            const stages = finalizeOnFailure(stagesRef.current);
            setTurns((previous) =>
              previous.map((turn) =>
                turn.id === id ? { id, question, state: 'stopped', stages } : turn,
              ),
            );
          } else {
            setTurns((previous) => previous.filter((turn) => turn.id !== id));
          }
        } else if (result.ok) {
          const { stages, skipped } = finalizeOnSuccess(stagesRef.current);
          setTurns((previous) =>
            previous.map((turn) =>
              turn.id === id
                ? { id, question, state: 'success', response: result.data, stages, skipped }
                : turn,
            ),
          );
        } else {
          const stages = finalizeOnFailure(stagesRef.current);
          setTurns((previous) =>
            previous.map((turn) =>
              turn.id === id ? { id, question, state: 'error', error: result.error, stages } : turn,
            ),
          );
        }
        isBusyRef.current = false;
        setIsBusy(false);
      });
    },
    [ask],
  );

  const stop = useCallback(() => {
    if (!isBusyRef.current) return;
    stoppedRef.current = true;
    controllerRef.current?.abort();
  }, []);

  return { turns, ask: submit, isBusy, stop };
}
