import { useState } from 'react';
import { PromptInput } from '@/components/agents/prompt-input';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_LENGTH = 1000;

export interface QuestionFormProps {
  onSubmit: (question: string) => void;
  /** Called when the stop button is clicked while `busy`. Omitting it keeps
   * the stop button disabled instead of rendering a dead control. */
  onStop?: () => void;
  busy?: boolean;
  maxLength?: number;
  className?: string;
}

export function QuestionForm({
  onSubmit,
  onStop,
  busy = false,
  maxLength = DEFAULT_MAX_LENGTH,
  className,
}: QuestionFormProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (prompt: string) => {
    onSubmit(prompt);
    setValue('');
  };

  return (
    <div className={cn('border-t border-border bg-background py-3', className)}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4">
        {/* No `models`/`actions` are passed, so PromptInput renders no model
         * picker or action popover — this stays a plain composer. */}
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={handleSubmit}
          loading={busy}
          onStop={onStop}
          disabled={busy}
          maxLength={maxLength}
          minRows={1}
          maxRows={8}
          aria-label="Escribí tu pregunta"
          placeholder="Preguntá algo sobre el manual de Alba…"
        />
        <span aria-live="polite" className="px-1 text-[11px] text-muted-foreground">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
