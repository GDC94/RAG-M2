import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const pillButtonVariants = cva(
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-fg-strong text-ink-50 hover:bg-fg-soft',
        muted: 'bg-ink-300 text-fg hover:bg-ink-350',
        glass: 'border border-fg-strong/5 bg-fg-strong/4 hover:bg-fg-strong/6',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

export interface PillButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButtonVariants> {}

export function PillButton({ variant, className, ...props }: PillButtonProps) {
  return (
    <button type="button" className={cn(pillButtonVariants({ variant }), className)} {...props} />
  );
}
