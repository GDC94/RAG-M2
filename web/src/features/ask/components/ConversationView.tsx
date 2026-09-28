import { Fragment } from 'react';
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
  MessageGroup,
  MessageScroller,
} from '@/components/agents/message';
import { cn } from '@/lib/utils';
import type { Turn } from '../useAsk';
import { AnswerMessage } from './AnswerMessage';
import { ErrorMessage } from './ErrorMessage';
import { PipelineProgress } from './PipelineProgress';

export interface ConversationViewProps {
  turns: Turn[];
  isBusy: boolean;
  onExampleClick: (question: string) => void;
  className?: string;
}

/** Real questions from data/gold_set.json, kept short for the empty-state prompt. */
const EXAMPLE_QUESTIONS = [
  '¿Cómo solicito vacaciones y con cuánta anticipación tengo que pedirlas?',
  'Me ofrecieron un regalito de treinta euros de parte de un cliente, ¿hace falta anotarlo en algún lado?',
  'Cancelé una ausencia desde el botón que vino en el mail de la notificación y me sigue figurando como pendiente, ¿por qué pasa esto?',
];

export function ConversationView({
  turns,
  isBusy,
  onExampleClick,
  className,
}: ConversationViewProps) {
  return (
    <MessageScroller
      className={cn('min-h-0 flex-1', className)}
      label="Conversación"
      busy={isBusy}
      contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
    >
      {turns.length === 0 ? (
        <EmptyState onExampleClick={onExampleClick} />
      ) : (
        <MessageGroup spacing="default">
          {turns.map((turn) => (
            <Fragment key={turn.id}>
              <Message from="user" animateIn>
                <MessageContent>
                  <MessageBubble variant="solid">
                    <MessageBubbleContent>
                      <p className="whitespace-pre-line">{turn.question}</p>
                    </MessageBubbleContent>
                  </MessageBubble>
                </MessageContent>
              </Message>

              <Message from="assistant">
                <MessageAvatar aria-hidden>AI</MessageAvatar>
                <MessageContent>
                  <PipelineProgress
                    state={turn.state}
                    stages={turn.stages}
                    status={turn.state === 'success' ? turn.response.status : undefined}
                    skipped={turn.state === 'success' ? turn.skipped : undefined}
                    timings={turn.state === 'success' ? turn.response.timings : undefined}
                  />
                </MessageContent>
              </Message>

              {turn.state === 'success' && <AnswerMessage response={turn.response} />}
              {turn.state === 'error' && <ErrorMessage error={turn.error} />}
              {turn.state === 'stopped' && (
                <ErrorMessage error={{ code: 'stopped', message: 'La consulta fue detenida' }} />
              )}
            </Fragment>
          ))}
        </MessageGroup>
      )}
    </MessageScroller>
  );
}

function EmptyState({ onExampleClick }: { onExampleClick: (question: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="max-w-sm text-sm text-muted-foreground">
        Preguntá lo que quieras saber sobre el manual de Alba People. Por ejemplo:
      </p>
      <div className="flex w-full max-w-md flex-col gap-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onExampleClick(question)}
            className="rounded-xl border border-border bg-background px-3.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted active:scale-[0.99]"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
