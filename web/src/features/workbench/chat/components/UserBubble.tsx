import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface UserBubbleProps {
  children: ReactNode;
  className?: string;
}

/** The user's question, right-aligned in a rounded bubble. */
export function UserBubble({ children, className }: UserBubbleProps) {
  return (
    <p
      className={cn(
        'self-end max-w-[84%] bg-bubble rounded-2xl px-[22px] py-[15px] leading-normal text-bubble-fg',
        className,
      )}
    >
      {children}
    </p>
  );
}
