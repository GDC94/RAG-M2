import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { MessageBubbleCollapsible } from '@/components/agents/message';
import { cn } from '@/lib/utils';
import type { RelatedChunk, Verdict } from '../schemas';

export interface DetailsPanelProps {
  chunks: RelatedChunk[];
  sources: string[];
  verification: Verdict | null;
  timings: Record<string, number> | null;
  raw: unknown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightedChunkId?: string | null;
  className?: string;
}

const VERIFIER_LABELS: Record<Verdict['label'], string> = {
  supported: 'Respaldada',
  incomplete: 'Incompleta',
  unsupported: 'Sin respaldo',
  wrong_status: 'Estado incorrecto',
};

/** Stages shown first, in this order; any other timing key is appended after. */
const TIMING_ORDER = ['embed', 'search', 'generate', 'verify', 'total'];

function orderTimingKeys(timings: Record<string, number>) {
  const known = TIMING_ORDER.filter((key) => key in timings);
  const rest = Object.keys(timings).filter((key) => !TIMING_ORDER.includes(key));
  return [...known, ...rest];
}

export function DetailsPanel({
  chunks,
  sources,
  verification,
  timings,
  raw,
  open,
  onOpenChange,
  highlightedChunkId,
  className,
}: DetailsPanelProps) {
  const contentId = useId();
  const [openChunks, setOpenChunks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!highlightedChunkId) return;
    setOpenChunks((previous) =>
      previous[highlightedChunkId] ? previous : { ...previous, [highlightedChunkId]: true },
    );
  }, [highlightedChunkId]);

  const timingKeys = timings ? orderTimingKeys(timings) : [];
  const maxTiming = timings ? Math.max(...Object.values(timings)) : 0;

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => onOpenChange(!open)}
        className="mt-1 inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>Ver detalles</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          id={contentId}
          className="mt-2 flex flex-col gap-4 rounded-xl border border-border bg-background/60 p-3 text-xs"
        >
          <section aria-label="Fragmentos recuperados" className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Fragmentos recuperados
            </h3>
            {chunks.length === 0 ? (
              <p className="text-muted-foreground">
                No se recuperaron fragmentos por encima del umbral
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {chunks.map((chunk) => {
                  const cited = sources.includes(chunk.section_title);
                  const isOpen = openChunks[chunk.chunk_id] ?? false;
                  return (
                    <li key={chunk.chunk_id} className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{chunk.section_title}</span>
                        <span className="text-muted-foreground">
                          {chunk.doc_id}@{chunk.version}
                        </span>
                        {cited && (
                          <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                            Citada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-foreground"
                            style={{ width: `${Math.round(chunk.score * 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground tabular-nums">
                          {chunk.score.toFixed(2)}
                        </span>
                      </div>
                      <div
                        data-testid={`chunk-text-${chunk.chunk_id}`}
                        data-state={isOpen ? 'open' : 'closed'}
                      >
                        <MessageBubbleCollapsible
                          open={isOpen}
                          onOpenChange={(next) =>
                            setOpenChunks((previous) => ({ ...previous, [chunk.chunk_id]: next }))
                          }
                          collapsedLines={3}
                          moreLabel="Ver texto completo"
                          lessLabel="Ocultar texto"
                        >
                          <p className="whitespace-pre-line text-muted-foreground">{chunk.text}</p>
                        </MessageBubbleCollapsible>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Verificador" className="flex flex-col gap-1">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Verificador
            </h3>
            {verification === null ? (
              <p className="text-muted-foreground">Verificador desactivado</p>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="w-fit rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                  {VERIFIER_LABELS[verification.label]}
                </span>
                <p className="text-muted-foreground">{verification.reason}</p>
              </div>
            )}
          </section>

          <section aria-label="Tiempos" className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Tiempos
            </h3>
            {!timings ? (
              <p className="text-muted-foreground">Sin tiempos</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {timingKeys.map((key) => {
                  const value = timings[key] ?? 0;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span
                        data-testid="timing-label"
                        className="w-20 shrink-0 text-muted-foreground"
                      >
                        {key}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{
                            width: `${maxTiming > 0 ? Math.round((value / maxTiming) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground tabular-nums">{value} ms</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Respuesta cruda" className="flex flex-col gap-1">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              JSON crudo
            </h3>
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-2 text-[11px]">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </section>
        </div>
      ) : null}
    </div>
  );
}
