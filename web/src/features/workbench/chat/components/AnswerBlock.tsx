import { TintTag } from '@/components/workbench-ui/TintTag';
import type { AnswerStatus } from '@/features/ask/schemas';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { VERDICT_TONES } from '@/lib/palette';
import { Citation } from './Citation';

const STATUS_LABEL: Record<Exclude<AnswerStatus, 'answered'>, string> = {
  not_in_manual: 'Fuera del manual',
  client_policy: 'Política de clientes',
};

export interface AnswerBlockProps {
  answer: string;
  status: AnswerStatus;
  isAnswered: boolean;
  /** Cited chunks in citation order (see `AskViewModel.citedChunks`). */
  citedChunks: ChunkViewModel[];
  onCiteClick: (chunk: ChunkViewModel) => void;
}

/** The assistant's answer text, followed by one `Citation` marker per cited
 * chunk when answered, or a status tag (no citations) when not. */
export function AnswerBlock({
  answer,
  status,
  isAnswered,
  citedChunks,
  onCiteClick,
}: AnswerBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-line text-base leading-relaxed text-bubble-fg">
        {answer}
        {isAnswered &&
          citedChunks.map((chunk, index) => (
            <Citation key={chunk.id} number={index + 1} onClick={() => onCiteClick(chunk)} />
          ))}
      </p>

      {!isAnswered && status !== 'answered' && (
        <TintTag tone={VERDICT_TONES.wrong_status.tint} className="self-start">
          {STATUS_LABEL[status]}
        </TintTag>
      )}
    </div>
  );
}
