import { ExternalLink, FileText } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CitationItem, Citations } from '@/components/agents/citations';
import { MonoValue } from '@/components/workbench-ui/MonoValue';
import { TintTag } from '@/components/workbench-ui/TintTag';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { FRAGMENT_TONES } from '@/lib/palette';
import { cn } from '@/lib/utils';

export interface SourcesListProps {
  /** All retrieved chunks for the turn (0..3), cited ones marked "Citada". */
  chunks: ChunkViewModel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (chunk: ChunkViewModel) => void;
}

/** "Fuentes" section: one row per retrieved chunk, revealed one by one.
 * Wraps the vendored `Citations`/`CitationItem` (see
 * `components/agents/citations.tsx`). */
export function SourcesList({ chunks, open, onOpenChange, onSelect }: SourcesListProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <Citations title="Fuentes" count={chunks.length} open={open} onOpenChange={onOpenChange}>
      {chunks.map((chunk, index) => {
        const tone = FRAGMENT_TONES[chunk.tone % FRAGMENT_TONES.length];
        return (
          <motion.div
            key={chunk.id}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, delay: 0.35 + index * 0.28 }}
          >
            <CitationItem
              id={`source-${chunk.id}`}
              onSelect={() => onSelect(chunk)}
              leading={
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-[5px] border',
                    tone.tint,
                  )}
                >
                  <FileText className="size-3" />
                </span>
              }
              title={
                <span className="flex min-w-0 items-center gap-1.5">
                  {chunk.cited && (
                    <TintTag tone={tone.tint} size="xs">
                      Citada
                    </TintTag>
                  )}
                  <span className="truncate">{chunk.sectionTitle}</span>
                </span>
              }
              meta={
                <span className="flex shrink-0 items-center gap-2 text-xs text-fg-faint">
                  <span>{chunk.docLabel}</span>
                  <MonoValue>{chunk.score.toFixed(2)}</MonoValue>
                  <span>#{chunk.rank}</span>
                  <ExternalLink className="size-3.5 text-fg-faint" aria-hidden="true" />
                </span>
              }
            />
          </motion.div>
        );
      })}
    </Citations>
  );
}
