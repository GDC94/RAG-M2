import { type TodoItem, TodoList } from '@/components/agents/todo-list';
import type { AnswerStatus, StageName } from '../schemas';
import type { StageStatus, TurnStages } from '../useAsk';

export type PipelineState = 'loading' | 'success' | 'error' | 'stopped';

export interface PipelineProgressProps {
  state: PipelineState;
  stages: TurnStages;
  /** Only meaningful when `state === 'success'`. */
  status?: AnswerStatus;
  skipped?: StageName[];
  timings?: Record<string, number> | null;
  className?: string;
}

const STAGE_ITEMS: { id: StageName; title: string }[] = [
  { id: 'embed', title: 'Generando embedding de la pregunta' },
  { id: 'search', title: 'Buscando fragmentos en el manual' },
  { id: 'generate', title: 'Generando respuesta' },
  { id: 'verify', title: 'Verificando la respuesta' },
];

const SUCCESS_TITLES: Record<AnswerStatus, string> = {
  answered: 'Respuesta encontrada !',
  not_in_manual: 'No está en el manual',
  client_policy: 'Política del cliente',
};

function titleFor(state: PipelineState, status?: AnswerStatus): string {
  switch (state) {
    case 'loading':
      return 'Consultando el manual…';
    case 'error':
      return 'No se pudo responder';
    case 'stopped':
      return 'Consulta detenida';
    case 'success':
      return status ? SUCCESS_TITLES[status] : SUCCESS_TITLES.answered;
  }
}

function detailFor(
  id: StageName,
  status: StageStatus,
  skipped: StageName[] | undefined,
  timings: Record<string, number> | null | undefined,
): string | undefined {
  if (status !== 'completed') return undefined;
  if (skipped?.includes(id)) return 'Omitida';
  const value = timings?.[id];
  if (value === undefined) return undefined;
  return `${Math.round(value)} ms`;
}

/**
 * Renders the four-stage retrieval pipeline as a beUI `TodoList`. Stays
 * mounted for the lifetime of its turn (loading → success/error/stopped), so
 * `collapseOnComplete` animates shut exactly once, right when the turn
 * settles, and the finished summary remains in the conversation history.
 */
export function PipelineProgress({
  state,
  stages,
  status,
  skipped,
  timings,
  className,
}: PipelineProgressProps) {
  const items: TodoItem[] = STAGE_ITEMS.map(({ id, title }) => ({
    id,
    title,
    status: stages[id],
    detail: detailFor(id, stages[id], skipped, timings),
  }));

  const label = state === 'loading' ? 'Buscando en el manual' : titleFor(state, status);

  return (
    <div role="status" aria-label={label} className={className}>
      <TodoList items={items} title={titleFor(state, status)} collapseOnComplete />
    </div>
  );
}
