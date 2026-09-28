import { LayoutGrid, PenLine, Search, ShieldCheck } from 'lucide-react';
import type { ComponentType } from 'react';
import { StepIndicator, type StepStatus } from '@/components/workbench-ui/StepIndicator';
import { STAGE_NAMES, type StageName } from '@/features/ask/schemas';
import type { StageStatus, TurnStages } from '@/features/ask/useAsk';
import { cn } from '@/lib/utils';
import { ShimmerText } from './ShimmerText';

const STAGE_ICON: Record<
  StageName,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  embed: LayoutGrid,
  search: Search,
  generate: PenLine,
  verify: ShieldCheck,
};

const STAGE_LABEL: Record<StageName, string> = {
  embed: 'Generando embedding',
  search: 'Buscando en el manual',
  generate: 'Redactando respuesta',
  verify: 'Verificando respuesta',
};

function toStepStatus(status: StageStatus): StepStatus {
  if (status === 'in-progress') return 'running';
  if (status === 'completed') return 'done';
  return 'pending';
}

const TEXT_COLOR: Record<StageStatus, string> = {
  pending: 'text-fg-ghost',
  'in-progress': 'text-fg-strong',
  completed: 'text-fg-muted',
  cancelled: 'text-fg-ghost',
};

export interface WorkingStepsProps {
  stages: TurnStages;
  /** Seconds elapsed since the turn started, ticking every second (see
   * `useElapsedSeconds`). */
  elapsedSeconds: number;
  className?: string;
}

/** The "working" turn body: a shimmering "Trabajando N s" label, then the
 * 4-step pipeline timeline (embed → search → generate → verify). */
export function WorkingSteps({ stages, elapsedSeconds, className }: WorkingStepsProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* The parent transcript is an `aria-live="polite"` `role="log"` (see
       * `MessageScroller`), which announces additions/text changes inside
       * it. The visible "Trabajando N s" label ticks every second, which
       * would otherwise be re-announced every second — it's hidden from the
       * accessibility tree, and a static sr-only "Trabajando" node is
       * announced once instead, when this turn starts. The eventual
       * completion is covered by the same log announcing the answer that
       * replaces this turn. */}
      <span className="sr-only">Trabajando</span>
      <span aria-hidden="true">
        <ShimmerText className="text-base font-medium">Trabajando {elapsedSeconds} s</ShimmerText>
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-fg-subtle">Ejecutando 4 pasos</p>

        <div className="flex flex-col">
          {STAGE_NAMES.map((stage, index) => {
            const status = stages[stage];
            const Icon = STAGE_ICON[stage];
            return (
              <div key={stage} className="flex flex-col">
                <div
                  className={cn(
                    'flex items-center gap-2.5 transition-colors duration-300',
                    TEXT_COLOR[status],
                  )}
                >
                  <StepIndicator status={toStepStatus(status)} />
                  <Icon className="size-[18px]" aria-hidden={true} />
                  <span className="text-sm">{STAGE_LABEL[stage]}</span>
                </div>
                {index < STAGE_NAMES.length - 1 && (
                  <div aria-hidden="true" className="ml-[7px] h-[22px] w-px bg-connector" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
