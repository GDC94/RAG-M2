import { ColorSquare } from '@/components/workbench-ui/ColorDot';
import { MonoValue } from '@/components/workbench-ui/MonoValue';
import type { StageName } from '@/features/ask/schemas';
import type { StageTimingViewModel, TimingsViewModel } from '@/features/ask/viewModel';
import { useReplayValue } from '@/hooks/useReplayValue';
import { STAGE_TONES } from '@/lib/palette';

const STAGE_LABEL: Record<StageName, string> = {
  embed: 'Embedding',
  search: 'Búsqueda',
  generate: 'Generación',
  verify: 'Verificación',
};

export interface TimingsGanttProps {
  timings: TimingsViewModel | null;
  /** Replay trigger — see `useReplayValue`. */
  animKey: number;
}

/** Per-stage timing breakdown: one row per pipeline stage with a
 * proportional bar on a shared track, positioned by cumulative start offset
 * and sized by its share of the total. Bar widths replay 0 → value on
 * `animKey` changes. */
export function TimingsGantt({ timings, animKey }: TimingsGanttProps) {
  if (!timings || timings.stages.length === 0) {
    return <p className="text-fg-faint text-sm">Sin datos de tiempos.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {timings.stages.map((stage) => (
        <TimingsGanttRow
          key={stage.stage}
          stage={stage}
          totalMs={timings.totalMs}
          animKey={animKey}
        />
      ))}
    </div>
  );
}

function TimingsGanttRow({
  stage,
  totalMs,
  animKey,
}: {
  stage: StageTimingViewModel;
  totalMs: number;
  animKey: number;
}) {
  const tone = STAGE_TONES[stage.stage];
  const leftPct = totalMs > 0 ? (stage.startMs / totalMs) * 100 : 0;
  const widthPct = totalMs > 0 ? (stage.ms / totalMs) * 100 : 0;
  const animatedWidthPct = useReplayValue(widthPct, animKey);

  return (
    <div className="grid grid-cols-[80px_1fr_76px] items-center gap-3">
      <div className="flex items-center gap-2">
        <ColorSquare solid={tone.solid} />
        <span className="text-fg text-sm">{STAGE_LABEL[stage.stage]}</span>
      </div>

      <div className="relative h-1.5 rounded-full bg-ink-300">
        <div
          data-testid="gantt-bar"
          className={`absolute h-1.5 min-w-0.5 rounded-full transition-[width] duration-[1100ms] ease-layout ${tone.solid}`}
          style={{ left: `${leftPct}%`, width: `${animatedWidthPct}%` }}
        />
      </div>

      <MonoValue className="text-right">{stage.ms} ms</MonoValue>
    </div>
  );
}
