import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetaItemProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}

export function MetaItem({ label, value, className }: MetaItemProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-sm text-fg-faint">{label}</span>
      <span className="text-base text-fg">{value}</span>
    </div>
  );
}
