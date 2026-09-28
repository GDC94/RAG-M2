import { useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
}

/** A shimmering gradient-text label ("Trabajando N s") that degrades to
 * plain muted text under `prefers-reduced-motion`. */
export function ShimmerText({ children, className }: ShimmerTextProps) {
  const reduce = useReducedMotion() ?? false;

  if (reduce) {
    return <span className={cn('text-fg-muted', className)}>{children}</span>;
  }

  return (
    <span className={cn('bg-shimmer animate-shimmer bg-clip-text text-transparent', className)}>
      {children}
    </span>
  );
}
