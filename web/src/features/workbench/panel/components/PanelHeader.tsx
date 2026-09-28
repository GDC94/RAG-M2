import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PanelHeaderProps {
  title: string;
  subtitle: ReactNode;
  /** Right-of-title slot: the verdict `TintTag` in `DetailTab`, the
   * "Citada" `TintTag` in `FragmentTab`. */
  trailing?: ReactNode;
  className?: string;
}

/** Shared header markup for the detail panel's scrollable tabs (`DetailTab`,
 * `FragmentTab`): a large title with an optional trailing tag, and a
 * subtitle line below. Extracted so the two tabs never duplicate this
 * className pattern. */
export function PanelHeader({ title, subtitle, trailing, className }: PanelHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-2 border-b border-divider px-9 pt-7 pb-8', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-medium text-fg-strong tracking-[-0.025em]">{title}</h2>
        {trailing}
      </div>
      <p className="text-base text-fg-subtle">{subtitle}</p>
    </header>
  );
}
