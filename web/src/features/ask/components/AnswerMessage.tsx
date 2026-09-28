import { useState } from 'react';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
} from '@/components/agents/message';
import type { MessageBubbleVariant } from '@/components/agents/message-bubble';
import { cn } from '@/lib/utils';
import type { AnswerStatus, QueryResponse } from '../schemas';
import { DetailsPanel } from './DetailsPanel';
import { SourceChips } from './SourceChips';

export interface AnswerMessageProps {
  response: QueryResponse;
}

const STATUS_LABELS: Record<AnswerStatus, string> = {
  answered: 'Respondida',
  not_in_manual: 'No está en el manual',
  client_policy: 'Política del cliente',
};

const STATUS_VARIANTS: Record<AnswerStatus, MessageBubbleVariant> = {
  answered: 'soft',
  not_in_manual: 'tint',
  client_policy: 'tint',
};

export function AnswerMessage({ response }: AnswerMessageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  const handleChipClick = (sectionTitle: string) => {
    setActiveSource(sectionTitle);
    setDetailsOpen(true);
    const matchingChunk = response.chunks_related.find(
      (chunk) => chunk.section_title === sectionTitle,
    );
    setHighlightedChunkId(matchingChunk?.chunk_id ?? null);
  };

  return (
    <Message from="assistant" animateIn>
      {/* The pipeline progress row above already carries the assistant
       * avatar for this turn; keep an invisible placeholder for alignment. */}
      <MessageAvatar placeholder />
      <MessageContent>
        <MessageBubble variant={STATUS_VARIANTS[response.status]}>
          <MessageBubbleContent>
            <span
              className={cn(
                'mb-1.5 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                response.status === 'answered'
                  ? 'bg-foreground/10 text-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {STATUS_LABELS[response.status]}
            </span>
            <p className="whitespace-pre-line">{response.system_answer}</p>
          </MessageBubbleContent>
        </MessageBubble>

        {response.sources.length > 0 && (
          <SourceChips
            sources={response.sources}
            activeSource={activeSource}
            onChipClick={handleChipClick}
          />
        )}

        <DetailsPanel
          chunks={response.chunks_related}
          sources={response.sources}
          verification={response.verification}
          timings={response.timings}
          raw={response}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          highlightedChunkId={highlightedChunkId}
          className="px-1"
        />
      </MessageContent>
    </Message>
  );
}
