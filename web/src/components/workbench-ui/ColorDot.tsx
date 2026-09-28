import { cn } from '@/lib/utils';

export interface ColorDotProps {
  /** Palette solid class string, e.g. `FRAGMENT_TONES[0].solid` — see `@/lib/palette`. */
  solid: string;
  className?: string;
}

export function ColorDot({ solid, className }: ColorDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-1.5 shrink-0 rounded-full', solid, className)}
    />
  );
}

export interface ColorSquareProps {
  solid: string;
  className?: string;
}

export function ColorSquare({ solid, className }: ColorSquareProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 shrink-0 rounded-[2px]', solid, className)}
    />
  );
}
