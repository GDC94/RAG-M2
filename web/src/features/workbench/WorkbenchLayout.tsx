import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface WorkbenchLayoutProps {
  /** CSS `grid-template-columns` value from `computeLayout` (see
   * `workbenchSelectors.ts`) — the only genuinely dynamic value here, so
   * it's the only inline style. */
  gridTemplateColumns: string;
  sidebarHidden: boolean;
  sidebar: ReactNode;
  chat: ReactNode;
  panel?: ReactNode;
}

/**
 * Presentational 3-column shell: sidebar / chat / detail panel. All layout
 * math (column widths, sidebar visibility) is computed by the container via
 * `computeLayout` and passed in as props — this component only renders it.
 */
export function WorkbenchLayout({
  gridTemplateColumns,
  sidebarHidden,
  sidebar,
  chat,
  panel,
}: WorkbenchLayoutProps) {
  return (
    <div
      className="grid h-screen grid-rows-1 overflow-hidden bg-ink-0 transition-[grid-template-columns] duration-[450ms] ease-layout"
      style={{ gridTemplateColumns }}
    >
      <div
        className={cn(
          'min-w-0 overflow-hidden transition-[opacity] duration-[450ms] ease-layout',
          sidebarHidden ? 'w-0 opacity-0' : 'w-full opacity-100',
        )}
        aria-hidden={sidebarHidden || undefined}
        inert={sidebarHidden || undefined}
      >
        {sidebar}
      </div>

      {chat}

      <div className="min-h-0 overflow-hidden border-l border-ink-300 bg-ink-0">{panel}</div>
    </div>
  );
}
