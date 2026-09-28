// Adapted from beUI (https://beui.dev) — MIT License, Copyright (c) 2026 Saurabh Chauhan. See web/THIRD_PARTY_NOTICES.md.
// beui.dev/components/motion/overflow-actions — adapted: restyled to this
// app's tokens (ink/fg/accent-1/tab-active) instead of the shadcn
// card/border/primary vars; items gained `active` (open-tab highlight),
// `onClose`/`closeLabel` (a sibling 20px close button next to a primary
// item, not nested inside its button), and `title` (long-form tooltip
// separate from the short `label`); the whole bar gained a `compact` prop
// that renders inactive primary items and every overflow item as icon-only
// 34px circles (see `features/workbench/panel/components/PanelTabs.tsx`).
'use client';

import { MoreHorizontal, X } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import { type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { useHoverCapable } from '@/lib/hooks/use-hover-capable';
import { cn } from '@/lib/utils';

export type OverflowActionItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** Highlights this item as the active tab (solid `bg-tab-active` surface,
   * `text-accent-1` icon) instead of the default muted surface. */
  active?: boolean;
  /** Renders a sibling 20px circular close button beside this item. Its
   * click never triggers the item's own `onClick` (it's a separate sibling
   * button, not nested — buttons can't nest). */
  onClose?: () => void;
  /** Accessible label/tooltip for the close button. Required when `onClose`
   * is given. */
  closeLabel?: string;
  /** Long-form tooltip (`title` attribute). Falls back to `label` when it's
   * a plain string. */
  title?: string;
};

export type OverflowActionsClassNames = {
  root?: string;
  track?: string;
  action?: string;
  primaryAction?: string;
  overflowAction?: string;
  toggle?: string;
  icon?: string;
  label?: string;
};

export interface OverflowActionsProps {
  primaryActions: OverflowActionItem[];
  overflowActions: OverflowActionItem[];
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onAction?: (item: OverflowActionItem) => void;
  collapseOnAction?: boolean;
  /** Renders inactive primary items and every overflow item as icon-only
   * 34px circles (no text label). Active primary items keep their label and
   * close button regardless. */
  compact?: boolean;
  openLabel?: string;
  closeLabel?: string;
  className?: string;
  classNames?: OverflowActionsClassNames;
}

// Softer layout spring than the app defaults so the overflow group stays
// visually attached to the toggle while entering and leaving.
const SHELL_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 17,
  mass: 0.85,
};

const ICON_VARIANTS: Variants = {
  hidden: { opacity: 0, filter: 'blur(3px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.18, ease: EASE_OUT } },
  exit: { opacity: 0, filter: 'blur(3px)', transition: { duration: 0.18, ease: EASE_OUT } },
};

const OVERFLOW_ACTION_VARIANTS: Variants = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
};

function useControllableExpanded({
  expanded,
  defaultExpanded,
  onExpandedChange,
}: {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded ?? false);
  const isControlled = expanded !== undefined;
  const value = expanded ?? internalExpanded;

  const setValue = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  return [value, setValue] as const;
}

export function OverflowActions({
  primaryActions,
  overflowActions,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onAction,
  collapseOnAction = false,
  compact = false,
  openLabel = 'Mostrar más pestañas',
  closeLabel = 'Ocultar más pestañas',
  className,
  classNames,
}: OverflowActionsProps) {
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const overflowId = useId();
  const overflowWrapperRef = useRef<HTMLDivElement>(null);
  const overflowWrapperLeftRef = useRef(0);
  const [isExpanded, setIsExpanded] = useControllableExpanded({
    expanded,
    defaultExpanded,
    onExpandedChange,
  });

  const transition = reduce ? { duration: 0 } : SHELL_TRANSITION;

  useLayoutEffect(() => {
    const overflowNode = overflowWrapperRef.current;
    if (!overflowNode) return;

    if (!isExpanded) {
      overflowNode.style.left = `${
        overflowWrapperLeftRef.current - overflowNode.getBoundingClientRect().left
      }px`;
      return;
    }

    overflowNode.style.left = '';
    overflowWrapperLeftRef.current = overflowNode.getBoundingClientRect().left;
  }, [isExpanded]);

  const handleAction = (item: OverflowActionItem) => {
    item.onClick?.();
    onAction?.(item);
    if (collapseOnAction) setIsExpanded(false);
  };

  return (
    <motion.div
      layout
      transition={transition}
      className={cn('inline-flex', classNames?.root, className)}
    >
      <motion.div
        layout
        transition={transition}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-full border border-ink-350 bg-ink-100 p-[5px]',
          classNames?.track,
        )}
      >
        <motion.div
          layout
          transition={transition}
          className="inline-flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none"
        >
          {primaryActions.map((item) => (
            <ActionButton
              key={item.id}
              item={item}
              compact={compact}
              reduce={reduce}
              canHover={canHover}
              onAction={handleAction}
              layoutTransition={transition}
              className={cn(classNames?.action, classNames?.primaryAction)}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="popLayout" initial={false}>
          {isExpanded ? (
            <motion.div
              key="overflow-actions"
              ref={overflowWrapperRef}
              id={overflowId}
              layout
              aria-hidden={!isExpanded}
              transition={transition}
              className="relative inline-flex w-max min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none"
            >
              {overflowActions.map((item) => (
                <ActionButton
                  key={item.id}
                  item={item}
                  compact={compact}
                  reduce={reduce}
                  canHover={canHover}
                  overflow
                  visible={isExpanded}
                  variants={OVERFLOW_ACTION_VARIANTS}
                  onAction={handleAction}
                  layoutTransition={transition}
                  className={cn(classNames?.action, classNames?.overflowAction)}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {overflowActions.length > 0 && (
          <motion.button
            type="button"
            layout
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? overflowId : undefined}
            aria-label={isExpanded ? closeLabel : openLabel}
            title={isExpanded ? closeLabel : openLabel}
            onClick={() => setIsExpanded(!isExpanded)}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            whileHover={reduce || !canHover ? undefined : { scale: 1.03 }}
            transition={transition}
            className={cn(
              'relative inline-grid size-[34px] shrink-0 place-items-center rounded-full bg-fg-strong text-ink-0 outline-none disabled:pointer-events-none disabled:opacity-50',
              'focus-visible:ring-2 focus-visible:ring-ring',
              classNames?.toggle,
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isExpanded ? 'close' : 'open'}
                variants={ICON_VARIANTS}
                initial={reduce ? { opacity: 0 } : 'hidden'}
                animate={reduce ? { opacity: 1 } : 'visible'}
                exit={reduce ? { opacity: 0 } : 'exit'}
                className="inline-grid place-items-center"
              >
                {isExpanded ? (
                  <X className="size-4" aria-hidden="true" />
                ) : (
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}

function ActionButton({
  item,
  compact,
  reduce,
  canHover,
  overflow = false,
  visible = true,
  variants,
  onAction,
  layoutTransition,
  className,
}: {
  item: OverflowActionItem;
  compact: boolean;
  reduce: boolean | null;
  canHover: boolean;
  overflow?: boolean;
  visible?: boolean;
  variants?: Variants;
  onAction: (item: OverflowActionItem) => void;
  layoutTransition: Transition;
  className?: string;
}) {
  const label = typeof item.label === 'string' ? item.label : undefined;
  const title = item.title ?? label;
  const active = item.active ?? false;
  // Icon-only 34px: overflow items are always icon-only in compact mode;
  // primary items only drop their label when compact *and* inactive.
  const iconOnly = compact && (overflow || !active);
  const showClose = !overflow && Boolean(item.onClose) && (!compact || active);

  return (
    <motion.span
      layout="position"
      variants={variants}
      initial={variants ? (reduce ? { opacity: 0 } : 'hidden') : undefined}
      animate={variants ? (reduce ? { opacity: 1 } : 'visible') : undefined}
      exit={variants ? (reduce ? { opacity: 0 } : 'exit') : undefined}
      whileTap={reduce || item.disabled ? undefined : { scale: 0.97 }}
      whileHover={reduce || !canHover || item.disabled ? undefined : { scale: 1.008 }}
      transition={layoutTransition}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full transition-colors duration-150',
        active ? 'bg-tab-active text-fg-strong' : 'bg-ink-0 text-fg-subtle',
      )}
    >
      <button
        type="button"
        disabled={item.disabled}
        aria-label={item.ariaLabel}
        aria-current={active ? 'true' : undefined}
        tabIndex={overflow && !visible ? -1 : undefined}
        title={title}
        onClick={() => onAction(item)}
        className={cn(
          'inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-full font-medium text-sm outline-none',
          'disabled:pointer-events-none disabled:opacity-45',
          'focus-visible:ring-2 focus-visible:ring-ring',
          iconOnly ? 'w-[34px] px-0' : 'px-3',
          className,
        )}
      >
        {item.icon ? (
          <span
            className={cn(
              'inline-flex size-4 shrink-0 items-center justify-center',
              active && 'text-accent-1',
            )}
          >
            {item.icon}
          </span>
        ) : null}
        {!iconOnly && <span className="whitespace-nowrap">{item.label}</span>}
      </button>

      {showClose && (
        <button
          type="button"
          aria-label={item.closeLabel}
          title={item.closeLabel}
          onClick={(event) => {
            event.stopPropagation();
            item.onClose?.();
          }}
          className="mr-1 inline-grid size-5 shrink-0 place-items-center rounded-full text-fg-faint outline-none transition-transform duration-150 hover:scale-105 hover:bg-ink-350 hover:text-fg active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </motion.span>
  );
}
