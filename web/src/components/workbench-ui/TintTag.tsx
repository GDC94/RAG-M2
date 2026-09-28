import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tintTagVariants = cva('inline-flex w-fit shrink-0 items-center gap-1 border font-medium', {
  variants: {
    size: {
      sm: 'h-[26px] rounded-[5px] px-[9px] text-sm',
      xs: 'rounded px-1.5 py-0.5 text-xs',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export interface TintTagProps extends VariantProps<typeof tintTagVariants> {
  /** Palette tint class string (translucent bg, translucent border, solid
   * text), e.g. `FRAGMENT_TONES[0].tint` or `TECH_TONES.python.tint` — see `@/lib/palette`. */
  tone: string;
  children: ReactNode;
  className?: string;
}

export function TintTag({ tone, size, children, className }: TintTagProps) {
  return <span className={cn(tintTagVariants({ size }), tone, className)}>{children}</span>;
}
