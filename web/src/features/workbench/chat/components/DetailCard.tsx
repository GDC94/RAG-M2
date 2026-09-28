import { FileText } from 'lucide-react';
import { ColorDot } from '@/components/workbench-ui/ColorDot';
import { MonoValue } from '@/components/workbench-ui/MonoValue';
import { pillButtonVariants } from '@/components/workbench-ui/PillButton';
import { RingCard } from '@/components/workbench-ui/RingCard';
import { SectionTitle } from '@/components/workbench-ui/SectionTitle';
import { TintTag } from '@/components/workbench-ui/TintTag';
import type { ChunkViewModel, VerdictViewModel } from '@/features/ask/viewModel';
import { fragmentListLabel } from '@/features/ask/viewModel';
import { FRAGMENT_TONES, VERDICT_TONES } from '@/lib/palette';
import { cn } from '@/lib/utils';

export interface DetailCardProps {
  chunks: ChunkViewModel[];
  verdict: VerdictViewModel | null;
  totalMs: number | null;
  /** Whether the detail panel is currently open and focused on this turn. */
  open: boolean;
  onToggle: () => void;
}

/** Summary card for a done turn: opens/closes the (phase 5) detail panel on
 * this turn. The whole card is the button — nothing inside is independently
 * clickable. */
export function DetailCard({ chunks, verdict, totalMs, open, onToggle }: DetailCardProps) {
  const verdictTone = verdict ? VERDICT_TONES[verdict.key].tint : VERDICT_TONES.wrong_status.tint;
  const verdictLabel = verdict?.label ?? 'Sin verificar';

  return (
    <RingCard
      interactive
      onClick={onToggle}
      className="w-full max-w-[580px] hover:-translate-y-0.5 active:scale-[.99]"
      innerClassName="flex flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink-250"
        >
          <FileText className="size-5 text-accent-1" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <SectionTitle as="h3">Detalle de la consulta</SectionTitle>
            <TintTag tone={verdictTone}>{verdictLabel}</TintTag>
          </div>
          <p className="text-sm text-fg-subtle">Fragmentos, verificador y tiempos</p>
        </div>

        <span
          className={cn(pillButtonVariants({ variant: open ? 'muted' : 'primary' }), 'shrink-0')}
        >
          {open ? 'Cerrar' : 'Abrir'}
          <span
            aria-hidden="true"
            className={cn(
              'inline-block transition-transform duration-300 ease-bounce',
              open && 'rotate-180',
            )}
          >
            →
          </span>
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-ink-250 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {chunks.map((chunk) => (
              <ColorDot
                key={chunk.id}
                solid={FRAGMENT_TONES[chunk.tone % FRAGMENT_TONES.length].solid}
                className="size-2.5 ring-2 ring-ink-50"
              />
            ))}
          </div>
          <span className="text-sm text-fg-muted">{fragmentListLabel(chunks)}</span>
        </div>
        <MonoValue>{totalMs !== null ? `${totalMs} ms` : '—'}</MonoValue>
      </div>
    </RingCard>
  );
}
