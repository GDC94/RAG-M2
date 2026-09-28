import { ArrowUp, Search } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useEffect } from 'react';
import { IconButton } from '@/components/workbench-ui/IconButton';
import { cn } from '@/lib/utils';

export interface ComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  isBusy: boolean;
  /** Submits the current `value` (dispatching `newQuestion` + `ask` is the
   * caller's job — this component only decides *when* to call it). */
  onSubmit: () => void;
  onStop: () => void;
  maxLength: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

/** The question input: search icon, text field, and a right-side slot that
 * swaps between a keyboard hint, a send button and a stop button. Also wires
 * a global ⌘/Ctrl+Enter shortcut so a question can be submitted without the
 * input focused. */
export function Composer({
  value,
  onValueChange,
  isBusy,
  onSubmit,
  onStop,
  maxLength,
  inputRef,
  className,
}: ComposerProps) {
  const reduce = useReducedMotion() ?? false;
  const canSubmit = value.trim().length > 0 && !isBusy;

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      if (!(event.key === 'Enter' && (event.metaKey || event.ctrlKey))) return;
      if (isBusy || value.trim().length === 0) return;
      event.preventDefault();
      onSubmit();
    }
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [isBusy, value, onSubmit]);

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden="true"
        className={cn(
          'bg-glow absolute -inset-3 rounded-[36px] blur-[14px] transition-opacity duration-[600ms]',
          isBusy ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="relative rounded-[30px] bg-ink-250 p-2.5 shadow-composer">
        <div className="flex min-h-[60px] items-center gap-3.5 rounded-[22px] bg-ink-0 pr-2.5 pl-5">
          <Search className="size-5 shrink-0 text-fg-faint" aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleInputKeyDown}
            maxLength={maxLength}
            disabled={isBusy}
            aria-label="Escribí tu pregunta"
            placeholder="Preguntá algo sobre el manual de Alba…"
            className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-placeholder disabled:opacity-60"
          />

          <AnimatePresence initial={false} mode="popLayout">
            {isBusy ? (
              <motion.span
                key="stop"
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <IconButton label="Detener" variant="solid-white" size="38" onClick={onStop}>
                  <span aria-hidden="true" className="size-3 rounded-[3px] bg-ink-0" />
                </IconButton>
              </motion.span>
            ) : value.length > 0 ? (
              <motion.span
                key="send"
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <IconButton
                  label="Enviar pregunta"
                  variant="solid-white"
                  size="38"
                  onClick={onSubmit}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </IconButton>
              </motion.span>
            ) : (
              <motion.span
                key="hint"
                aria-hidden="true"
                initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm text-fg-muted"
              >
                ⌘ + ↵
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
