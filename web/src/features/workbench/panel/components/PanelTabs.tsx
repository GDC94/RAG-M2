import { Braces, FileText, Layers, Maximize2, Minimize2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { type OverflowActionItem, OverflowActions } from '@/components/motion/overflow-actions';
import { IconButton } from '@/components/workbench-ui/IconButton';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import type { TabKey } from '@/features/workbench/workbenchReducer';
import { tabLabel, tabTitle } from '@/features/workbench/workbenchSelectors';

function tabIcon(key: TabKey): ReactNode {
  if (key === 'detail') return <FileText aria-hidden="true" className="size-full" />;
  if (key === 'json') return <Braces aria-hidden="true" className="size-full" />;
  return <Layers aria-hidden="true" className="size-full" />;
}

export interface PanelTabsProps {
  tabs: readonly TabKey[];
  active: TabKey | null;
  /** Available-but-not-open tabs — the overflow menu contents (see
   * `overflowTabs` in `workbenchSelectors.ts`). */
  overflowKeys: readonly TabKey[];
  chunks: readonly ChunkViewModel[];
  overflowOpen: boolean;
  onOverflowOpenChange: (open: boolean) => void;
  /** Renders inactive open tabs and every overflow tab as icon-only 34px
   * circles — the panel's compact layout (< 600px). */
  compact: boolean;
  wide: boolean;
  onActivate: (key: TabKey) => void;
  onClose: (key: TabKey) => void;
  onOpen: (key: TabKey) => void;
  onToggleWide: () => void;
  onClosePanel: () => void;
}

/** The detail panel's 64px tab header: open tabs (closable), an overflow
 * menu of not-yet-open tabs, and — hidden while that menu is open — the
 * expand/collapse and close-panel shortcuts. Built on the vendored
 * `OverflowActions` (see `components/motion/overflow-actions.tsx`). */
export function PanelTabs({
  tabs,
  active,
  overflowKeys,
  chunks,
  overflowOpen,
  onOverflowOpenChange,
  compact,
  wide,
  onActivate,
  onClose,
  onOpen,
  onToggleWide,
  onClosePanel,
}: PanelTabsProps) {
  const primaryActions: OverflowActionItem[] = tabs.map((key) => {
    const label = tabLabel(key, chunks);
    const title = tabTitle(key, chunks);
    return {
      id: key,
      label,
      title,
      // Compact mode drops the visible text label for inactive tabs
      // (icon-only 34px circles); `aria-label` must carry a name then, so it
      // mirrors the long-form `title` rather than the short pill label —
      // same accessible name whether or not the visible label is showing.
      ariaLabel: title,
      icon: tabIcon(key),
      active: key === active,
      onClick: () => onActivate(key),
      onClose: () => onClose(key),
      closeLabel: `Cerrar pestaña ${label}`,
    };
  });

  const overflowActions: OverflowActionItem[] = overflowKeys.map((key) => {
    const label = tabLabel(key, chunks);
    const title = tabTitle(key, chunks);
    return {
      id: key,
      label,
      title,
      ariaLabel: title,
      icon: tabIcon(key),
      onClick: () => onOpen(key),
    };
  });

  return (
    <div className="flex h-16 items-center gap-2 border-b border-divider px-4">
      <OverflowActions
        primaryActions={primaryActions}
        overflowActions={overflowActions}
        expanded={overflowOpen}
        onExpandedChange={onOverflowOpenChange}
        collapseOnAction
        compact={compact}
        openLabel="Mostrar más pestañas"
        closeLabel="Ocultar más pestañas"
        className="min-w-0 flex-1"
      />

      {!overflowOpen && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={wide ? 'Reducir panel' : 'Expandir panel'} onClick={onToggleWide}>
            {wide ? (
              <Minimize2 className="size-[18px]" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-[18px]" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton label="Cerrar panel" onClick={onClosePanel}>
            <X className="size-[18px]" aria-hidden="true" />
          </IconButton>
        </div>
      )}
    </div>
  );
}
