import { Sparkles } from 'lucide-react';
import { FRAGMENT_TONES, STAGE_TONES } from '@/lib/palette';
import { cn } from '@/lib/utils';

const EXAMPLE_QUESTIONS = [
  '¿Hace falta anotar un regalo de un cliente?',
  '¿Cuánto tengo para presentar un informe de gastos?',
  '¿Cuál es el tope de hotel en Madrid?',
  '¿Qué día se paga la nómina?',
];

/** One tone per chip, cycling accent-1..4 (fragment tones 0-2, then the
 * "verify" stage's accent-4). */
const CHIP_TONES = [FRAGMENT_TONES[0], FRAGMENT_TONES[1], FRAGMENT_TONES[2], STAGE_TONES.verify];

export interface ExampleChipsProps {
  /** Fills the composer with the picked question; never submits it. */
  onSelect: (question: string) => void;
  className?: string;
}

export function ExampleChips({ onSelect, className }: ExampleChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {EXAMPLE_QUESTIONS.map((question, index) => {
        const tone = CHIP_TONES[index % CHIP_TONES.length];
        return (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-ink-350 bg-ink-100 px-3.5 text-sm text-fg-muted outline-none transition hover:-translate-y-px hover:border-ink-400 hover:text-fg-strong focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className={cn('size-[13px]', tone.text)} aria-hidden="true" />
            {question}
          </button>
        );
      })}
    </div>
  );
}
