import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RingCardProps {
  children: ReactNode;
  /** Adds the hover lift/ring used for clickable cards. Independent of
   * `onClick` so a card can look interactive while being driven by a parent. */
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  innerClassName?: string;
  'aria-label'?: string;
}

export function RingCard({
  children,
  interactive = false,
  onClick,
  className,
  innerClassName,
  ...rest
}: RingCardProps) {
  const outerClassName = cn(
    'rounded-[14px] bg-ink-250 p-1',
    interactive &&
      'transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-ink-350',
    onClick && 'text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className,
  );
  const inner = <div className={cn('rounded-[10px] bg-ink-50', innerClassName)}>{children}</div>;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={outerClassName} {...rest}>
        {inner}
      </button>
    );
  }

  return (
    <div className={outerClassName} {...rest}>
      {inner}
    </div>
  );
}
