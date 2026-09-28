import { useEffect } from 'react';
import { TintTag } from '@/components/workbench-ui/TintTag';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { FRAGMENT_TONES } from '@/lib/palette';
import { PanelHeader } from './components/PanelHeader';

type BodyBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

/** Splits an already heading-stripped chunk body into paragraphs on blank
 * lines; a paragraph whose lines all start with "- " becomes a bullet list
 * instead of prose. No markdown library — this is the only markup the
 * backend's chunk text ever uses. */
function parseBody(text: string): BodyBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): BodyBlock => {
      const lines = block.split('\n').map((line) => line.trim());
      if (lines.every((line) => line.startsWith('- '))) {
        return { type: 'ul', items: lines.map((line) => line.slice(2)) };
      }
      return { type: 'p', text: lines.join(' ') };
    });
}

export interface FragmentTabProps {
  /** The chunk this tab shows, resolved by the panel from the tab's
   * `frag-<index>` key. `undefined` when that index no longer exists in the
   * focused turn's chunks (e.g. a stale tab). */
  chunk: ChunkViewModel | undefined;
  /** Called when `chunk` is `undefined`, so the panel can close this tab
   * instead of showing an empty one. */
  onMissing: () => void;
}

/** Scrollable single-fragment tab: the chunk's section title, its document
 * and score, and its full body text. No cited-passage highlight — the
 * backend reports no cited spans, only whole cited chunks (see
 * `features/ask/viewModel.ts`). */
export function FragmentTab({ chunk, onMissing }: FragmentTabProps) {
  useEffect(() => {
    if (!chunk) onMissing();
  }, [chunk, onMissing]);

  if (!chunk) return null;

  const tone = FRAGMENT_TONES[chunk.tone % FRAGMENT_TONES.length];
  const blocks = parseBody(chunk.body);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelHeader
        title={chunk.sectionTitle}
        subtitle={`${chunk.docLabel} · score ${chunk.score.toFixed(2)}`}
        trailing={
          chunk.cited && (
            <TintTag tone={tone.tint} size="sm">
              Citada
            </TintTag>
          )
        }
      />

      <div className="flex max-w-[760px] flex-col gap-[22px] px-9 py-8">
        {blocks.map((block, index) => {
          const key = index;
          return block.type === 'ul' ? (
            <ul
              key={key}
              className="flex list-disc flex-col gap-1.5 pl-5 text-base text-fg-muted leading-[1.8]"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p key={key} className="text-base text-fg-muted leading-[1.8]">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
