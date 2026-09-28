import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MonoValueProps {
  children: ReactNode;
  /** Optional palette text class, e.g. `JSON_TOKEN_CLASSES.number` from `@/lib/jsonHighlight`. */
  tone?: string;
  className?: string;
}

export function MonoValue({ children, tone, className }: MonoValueProps) {
  return <span className={cn('font-mono text-xs text-fg-soft', tone, className)}>{children}</span>;
}
