import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionTitleProps {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

export function SectionTitle({ children, as: Component = 'h3', className }: SectionTitleProps) {
  return (
    <Component className={cn('text-base font-medium text-fg', className)}>{children}</Component>
  );
}
