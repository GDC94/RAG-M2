// Adapted from beUI (https://beui.dev) — MIT License, Copyright (c) 2026 Saurabh Chauhan. See web/THIRD_PARTY_NOTICES.md.
'use client';
// beui.dev/components/agents/citations — adapted: no favicon/url navigation
// (this app's citations point at in-app fragment tabs, never external URLs),
// rows are buttons that call `onSelect` instead of anchors, and the list
// content is a `children` slot instead of a fixed `citations` prop so the
// caller controls each row's entrance animation (see
// `features/workbench/chat/components/SourcesList.tsx`).

import { ChevronDown, FolderOpen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useId, useState } from 'react';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { SPRING_SWAP } from '@/lib/ease';
import { cn } from '@/lib/utils';

export interface CitationItemProps {
  id: string;
  /** Small leading glyph slot, e.g. a colored `ColorSquare` + icon. */
  leading?: ReactNode;
  title: ReactNode;
  /** Trailing metadata slot, e.g. doc label / score / rank / external-link icon. */
  meta?: ReactNode;
  onSelect?: () => void;
  className?: string;
}

/** One citation row. Always a button — this app never navigates away from a
 * citation, it opens an in-app fragment tab instead. */
export function CitationItem({ id, leading, title, meta, onSelect, className }: CitationItemProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onSelect}
      className={cn(
        'group/citation flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left outline-none transition-colors hover:bg-ink-350/60 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate text-sm text-fg">{title}</span>
      {meta}
    </button>
  );
}

export interface CitationsProps {
  title?: ReactNode;
  count: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** Collapsible "Fuentes" section: a toggle header (title + counter + chevron)
 * over an `AgentDisclosure`-driven list. Content is a `children` slot. */
export function Citations({
  title = 'Fuentes',
  count,
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: CitationsProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const contentId = `${baseId}-content`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const currentOpen = open ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, open],
  );

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        aria-expanded={currentOpen}
        aria-controls={contentId}
        onClick={() => setOpen(!currentOpen)}
        className="group -ml-1 flex min-h-8 items-center gap-2 rounded-lg px-1 text-left text-fg-muted outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FolderOpen className="size-4" aria-hidden="true" />
        <span className="font-medium">{title}</span>
        <span className="rounded-full bg-ink-350 px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted tabular-nums">
          {count}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: currentOpen ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SWAP}
          className="text-fg-faint"
        >
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>

      <AgentDisclosure id={contentId} open={currentOpen}>
        <div className="mt-1 grid gap-0.5">{children}</div>
      </AgentDisclosure>
    </div>
  );
}
