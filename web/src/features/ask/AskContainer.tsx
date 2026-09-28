import type { askQuestionStream } from './api';
import { ConversationView } from './components/ConversationView';
import { QuestionForm } from './components/QuestionForm';
import { useAsk } from './useAsk';

export interface AskContainerProps {
  /** Injectable for tests; defaults to the real `askQuestionStream`. */
  askFn?: typeof askQuestionStream;
}

export function AskContainer({ askFn }: AskContainerProps) {
  const { turns, ask, isBusy, stop } = useAsk({ ask: askFn });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConversationView turns={turns} isBusy={isBusy} onExampleClick={ask} />
      <QuestionForm onSubmit={ask} onStop={stop} busy={isBusy} />
    </div>
  );
}
