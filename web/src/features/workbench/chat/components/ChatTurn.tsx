import { useRef } from 'react';
import type { StageName } from '@/features/ask/schemas';
import type { Turn } from '@/features/ask/useAsk';
import type { AskViewModel } from '@/features/ask/viewModel';
import type { TabKey } from '@/features/workbench/workbenchReducer';
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds';
import { usePacedStages } from '@/hooks/usePacedStages';
import { DoneTurn } from './DoneTurn';
import { TurnError } from './TurnError';
import { UserBubble } from './UserBubble';
import { WorkingSteps } from './WorkingSteps';

const NO_SKIPPED: readonly StageName[] = [];

export interface ChatTurnProps {
  turn: Turn;
  /** The pre-computed view model for a `success` turn; undefined otherwise. */
  viewModel?: AskViewModel;
  panelOpenForThisTurn: boolean;
  citationsOpen: boolean;
  onCitationsOpenChange: (open: boolean) => void;
  onOpenTab: (key: TabKey, turnId: string) => void;
  onClosePanel: () => void;
}

/**
 * One question/answer turn: the user's bubble, then whichever body matches
 * the turn's current state (working timeline, done answer, or error).
 *
 * Owns this turn's start time (captured once, on mount) and the elapsed
 * seconds derived from it — both the live "Trabajando N s" counter and the
 * frozen client-side fallback used by `DoneTurn` when the server reports no
 * timings live here, since this component instance persists across the
 * turn's `loading` → `success`/`error`/`stopped` transition.
 *
 * The step timeline's real per-stage progress (`turn.stages`) is paced
 * before display (see `usePacedStages`/`pacing.ts`): a `success` turn keeps
 * showing the working timeline until the paced display has caught up with
 * (settled on) the real stages, so a stage that finished before it could
 * ever be painted "running" (or a trailing stage settling) is still visible
 * for a moment. The "Trabajando N s" counter freezes the instant the turn
 * resolves (`useElapsedSeconds` ties `running` to `state === 'loading'`,
 * unchanged) rather than at the end of that pacing window — chosen because
 * the window is short (bounded by `MIN_STEP_MS` times the number of stages
 * still animating) and a frozen-but-correct counter reads better than one
 * that keeps ticking past the point the server actually answered.
 */
export function ChatTurn({
  turn,
  viewModel,
  panelOpenForThisTurn,
  citationsOpen,
  onCitationsOpenChange,
  onOpenTab,
  onClosePanel,
}: ChatTurnProps) {
  const startedAtRef = useRef(Date.now());
  const elapsedSeconds = useElapsedSeconds(startedAtRef.current, turn.state === 'loading');
  const skipped = turn.state === 'success' ? turn.skipped : NO_SKIPPED;
  const { stages: pacedStages, settled } = usePacedStages(turn.stages, skipped);
  const showWorking = turn.state === 'loading' || (turn.state === 'success' && !settled);

  return (
    <div className="flex flex-col gap-3">
      <UserBubble>{turn.question}</UserBubble>

      {showWorking && <WorkingSteps stages={pacedStages} elapsedSeconds={elapsedSeconds} />}

      {turn.state === 'success' && viewModel && settled && (
        <DoneTurn
          viewModel={viewModel}
          turnId={turn.id}
          clientElapsedSeconds={elapsedSeconds}
          panelOpenForThisTurn={panelOpenForThisTurn}
          citationsOpen={citationsOpen}
          onCitationsOpenChange={onCitationsOpenChange}
          onOpenTab={onOpenTab}
          onClosePanel={onClosePanel}
        />
      )}

      {turn.state === 'error' && <TurnError state="error" error={turn.error} />}
      {turn.state === 'stopped' && <TurnError state="stopped" />}
    </div>
  );
}
