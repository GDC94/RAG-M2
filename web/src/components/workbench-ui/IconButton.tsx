import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-transform duration-150 hover:scale-[1.04] active:scale-[.96] focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        ghost: 'bg-transparent text-fg-muted hover:bg-ink-350 hover:text-fg',
        'solid-white': 'bg-fg-strong text-ink-50 hover:bg-fg-soft',
      },
      size: {
        '20': 'size-5',
        '34': 'size-[34px]',
        '38': 'size-[38px]',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: '34',
    },
  },
);

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'aria-label' | 'type'>,
    VariantProps<typeof iconButtonVariants> {
  /** Required: becomes both `aria-label` (screen readers) and `title` (hover tooltip). */
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  variant,
  size,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
