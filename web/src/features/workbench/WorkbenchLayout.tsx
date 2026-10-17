import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WorkbenchLayoutProps {
  /** CSS `grid-template-columns` value from `computeLayout` (see
   * `workbenchSelectors.ts`) — the only genuinely dynamic value here, so
   * it's the only inline style. */
  gridTemplateColumns: string;
  sidebarHidden: boolean;
  /** Single-column mode (`computeLayout().mobile`): the sidebar is a slide-in
   * drawer over the chat and the panel a full-screen overlay. */
  mobile?: boolean;
  /** Called when the mobile drawer's backdrop is tapped. */
  onDismissSidebar?: () => void;
  sidebar: ReactNode;
  chat: ReactNode;
  panel?: ReactNode;
}

/**
 * Presentational 3-column shell: sidebar / chat / detail panel. All layout
 * math (column widths, sidebar visibility) is computed by the container via
 * `computeLayout` and passed in as props — this component only renders it.
 * In `mobile` mode the sidebar and panel leave the grid and float over the
 * chat instead.
 */
export function WorkbenchLayout({
  gridTemplateColumns,
  sidebarHidden,
  mobile = false,
  onDismissSidebar,
  sidebar,
  chat,
  panel,
}: WorkbenchLayoutProps) {
  return (
    <div
      className="grid h-dvh grid-rows-1 overflow-hidden bg-ink-0 transition-[grid-template-columns] duration-[450ms] ease-layout"
      style={{ gridTemplateColumns }}
    >
      {mobile && !sidebarHidden && (
        <button
          type="button"
          aria-label="Cerrar barra lateral"
          onClick={onDismissSidebar}
          className="fixed inset-0 z-30 cursor-default bg-ink-0/60"
        />
      )}

      <div
        className={cn(
          'min-w-0 overflow-hidden transition-[opacity] duration-[450ms] ease-layout',
          mobile
            ? cn(
                'fixed inset-y-0 left-0 z-40 w-[272px] max-w-[85vw] bg-ink-100 transition-transform',
                sidebarHidden ? '-translate-x-full' : 'translate-x-0',
              )
            : sidebarHidden
              ? 'w-0 opacity-0'
              : 'w-full opacity-100',
        )}
        aria-hidden={sidebarHidden || undefined}
        inert={sidebarHidden || undefined}
      >
        {sidebar}
      </div>

      {chat}

      {mobile ? (
        panel && <div className="fixed inset-0 z-20 overflow-hidden bg-ink-0">{panel}</div>
      ) : (
        <div className="min-h-0 overflow-hidden border-l border-ink-300 bg-ink-0">{panel}</div>
      )}
    </div>
  );
}
