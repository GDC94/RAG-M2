import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { IconButton } from '@/components/workbench-ui/IconButton';

export interface ChatHeaderProps {
  sidebarHidden: boolean;
  onShowSidebar: () => void;
  /** True when the latest turn has a response and the detail panel is closed. */
  showOpenPanelButton: boolean;
  onOpenPanel: () => void;
}

/** The 64px chat header: no title, just the "show sidebar" toggle (moved
 * here from the sidebar itself once it's collapsed) and the "open detail
 * panel" shortcut for the latest answer. */
export function ChatHeader({
  sidebarHidden,
  onShowSidebar,
  showOpenPanelButton,
  onOpenPanel,
}: ChatHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-4">
      {sidebarHidden ? (
        <IconButton label="Mostrar barra lateral" onClick={onShowSidebar}>
          <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
        </IconButton>
      ) : (
        <span />
      )}

      {showOpenPanelButton && (
        <IconButton label="Abrir panel de detalle" onClick={onOpenPanel}>
          <PanelRightOpen className="size-[18px]" aria-hidden="true" />
        </IconButton>
      )}
    </header>
  );
}
