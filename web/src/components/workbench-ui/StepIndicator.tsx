import { cn } from '@/lib/utils';

export type StepStatus = 'pending' | 'running' | 'done';

export interface StepIndicatorProps {
  status: StepStatus;
  /** Overrides the default Spanish accessible label for this status. */
  label?: string;
  className?: string;
}

const DEFAULT_LABEL: Record<StepStatus, string> = {
  pending: 'Pendiente',
  running: 'En curso',
  done: 'Completado',
};

/** `running` shows a 14px spinner; `pending`/`done` share the same 7px
 * hollow circle (their difference is conveyed elsewhere, e.g. by a
 * checkmark composed around this indicator). */
export function StepIndicator({ status, label, className }: StepIndicatorProps) {
  const accessibleLabel = label ?? DEFAULT_LABEL[status];

  if (status === 'running') {
    return (
      <span
        role="status"
        aria-label={accessibleLabel}
        className={cn(
          'inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-400 border-t-fg-strong',
          className,
        )}
      />
    );
  }

  return (
    <span
      role="status"
      aria-label={accessibleLabel}
      className={cn(
        'inline-block size-[7px] shrink-0 rounded-full border border-ink-400',
        className,
      )}
    />
  );
}
