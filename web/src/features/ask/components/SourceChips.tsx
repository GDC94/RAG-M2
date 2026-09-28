import { cn } from '@/lib/utils';

export interface SourceChipsProps {
  sources: string[];
  activeSource?: string | null;
  onChipClick: (source: string) => void;
  className?: string;
}

export function SourceChips({ sources, activeSource, onChipClick, className }: SourceChipsProps) {
  if (sources.length === 0) return null;

  return (
    <section aria-label="Fuentes citadas" className={cn('flex flex-wrap gap-1.5 px-1', className)}>
      {sources.map((source) => (
        <button
          key={source}
          type="button"
          aria-pressed={activeSource === source}
          onClick={() => onChipClick(source)}
          className={cn(
            'rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
            activeSource === source && 'border-transparent bg-muted text-foreground',
          )}
        >
          {source}
        </button>
      ))}
    </section>
  );
}
