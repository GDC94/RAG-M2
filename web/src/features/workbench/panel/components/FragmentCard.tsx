import { MonoValue } from '@/components/workbench-ui/MonoValue';
import { RingCard } from '@/components/workbench-ui/RingCard';
import { TintTag } from '@/components/workbench-ui/TintTag';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { FRAGMENT_TONES } from '@/lib/palette';
import { ScoreRing } from './ScoreRing';

export interface FragmentCardProps {
  chunk: ChunkViewModel;
  /** Replay trigger for this card's `ScoreRing` — see `useReplayValue`. */
  animKey: number;
  onClick: () => void;
}

/** One retrieved-chunk summary in "Fragmentos recuperados": the whole card
 * is a button that opens the matching fragment tab. Left: the score ring.
 * Right: tags, title and a short preview. */
export function FragmentCard({ chunk, animKey, onClick }: FragmentCardProps) {
  const tone = FRAGMENT_TONES[chunk.tone % FRAGMENT_TONES.length];

  return (
    <RingCard interactive onClick={onClick} className="w-full" innerClassName="flex gap-4 p-4">
      <ScoreRing score={chunk.score} tone={tone} animKey={animKey} />

      <div className="flex min-w-0 flex-1 flex-col gap-2 text-left">
        <div className="flex items-center gap-1.5">
          <TintTag tone={tone.tint} size="sm">
            Frag. {chunk.number}
          </TintTag>
          {chunk.cited && (
            <TintTag tone={FRAGMENT_TONES[0].tint} size="sm">
              Citada
            </TintTag>
          )}
          <MonoValue tone="text-fg-ghost" className="ml-auto">
            #{chunk.rank}
          </MonoValue>
        </div>

        <p className="text-base text-fg tracking-tight">{chunk.shortTitle}</p>
        <p className="line-clamp-2 text-fg-subtle text-sm">{chunk.preview}</p>
        <span className="text-fg-muted text-xs">Ver fragmento completo →</span>
      </div>
    </RingCard>
  );
}
