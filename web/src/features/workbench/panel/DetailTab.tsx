import { MetaItem } from '@/components/workbench-ui/MetaItem';
import { RingCard } from '@/components/workbench-ui/RingCard';
import { SectionTitle } from '@/components/workbench-ui/SectionTitle';
import { TintTag } from '@/components/workbench-ui/TintTag';
import type { AskViewModel, ChunkViewModel } from '@/features/ask/viewModel';
import { VERDICT_TONES } from '@/lib/palette';
import { FragmentCard } from './components/FragmentCard';
import { PanelHeader } from './components/PanelHeader';
import { TimingsGantt } from './components/TimingsGantt';

export interface DetailTabProps {
  viewModel: AskViewModel;
  /** Replay trigger for this tab's `ScoreRing`s/`TimingsGantt` — see
   * `useReplayValue`. */
  animKey: number;
  onOpenFragment: (chunk: ChunkViewModel) => void;
  onOpenJson: () => void;
}

/** Scrollable "Detalle de la consulta" tab: verdict summary, meta (cited
 * source / document / total time), verifier explanation, retrieved
 * fragments and per-stage timings, plus a shortcut into the raw-JSON tab. */
export function DetailTab({ viewModel, animKey, onOpenFragment, onOpenJson }: DetailTabProps) {
  const { verdict, chunks, citedChunks, timings, docLabel } = viewModel;
  const verdictTone = verdict ? VERDICT_TONES[verdict.key].tint : VERDICT_TONES.wrong_status.tint;
  const verdictLabel = verdict?.label ?? 'Sin verificar';
  const citedSource = citedChunks[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelHeader
        title="Detalle de la consulta"
        subtitle={viewModel.question}
        trailing={<TintTag tone={verdictTone}>{verdictLabel}</TintTag>}
      />

      <div className="flex flex-col gap-10 px-9 py-8">
        <div className="flex flex-wrap gap-x-11 gap-y-5">
          <MetaItem
            label="Fuente citada"
            value={citedSource ? `Frag. ${citedSource.number} · ${citedSource.shortTitle}` : '—'}
          />
          <MetaItem label="Documento" value={docLabel ?? '—'} />
          <MetaItem label="Tiempo total" value={timings ? `${timings.totalMs} ms` : '—'} />
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>Verificador</SectionTitle>
          <p className="text-base text-fg-muted leading-relaxed">
            {verdict?.explanation ?? 'El verificador no se ejecutó.'}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Fragmentos recuperados</SectionTitle>
          {chunks.length === 0 ? (
            <p className="text-fg-faint text-sm">No se recuperó ningún fragmento.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {chunks.map((chunk) => (
                <FragmentCard
                  key={chunk.id}
                  chunk={chunk}
                  animKey={animKey}
                  onClick={() => onOpenFragment(chunk)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>Tiempos</SectionTitle>
          <TimingsGantt timings={timings} animKey={animKey} />
        </div>

        <RingCard innerClassName="flex items-center justify-between p-4">
          <span className="text-base text-fg">JSON crudo</span>
          <button
            type="button"
            onClick={onOpenJson}
            className="rounded text-link text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Abrir
          </button>
        </RingCard>
      </div>
    </div>
  );
}
