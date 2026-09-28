/**
 * Pure derived-data helpers for the workbench detail panel: which tabs exist
 * for a given turn, which are in the tab-bar overflow menu, their labels, and
 * the responsive grid/panel layout math.
 */

import type { ChunkViewModel } from '@/features/ask/viewModel';
import type { TabKey, WorkbenchState } from './workbenchReducer';

const SIDEBAR_WIDTH_PX = 272;
/** Minimum room the chat column must keep, regardless of panel width. */
const CHAT_MIN_WIDTH_PX = 420;
const PANEL_MIN_WIDTH_PX = 340;
const PANEL_COMPACT_THRESHOLD_PX = 600;

/** Every tab that could exist for a turn with `chunkCount` retrieved chunks
 * (0..3), in the fixed display order: detail, fragments, json. */
export function availableTabs(chunkCount: number): TabKey[] {
  const fragments: TabKey[] = Array.from(
    { length: chunkCount },
    (_, index): TabKey => `frag-${index}`,
  );
  return ['detail', ...fragments, 'json'];
}

/** Available tabs that aren't already open, in available order — the
 * contents of the tab-bar overflow menu. */
export function overflowTabs(state: WorkbenchState, chunkCount: number): TabKey[] {
  return availableTabs(chunkCount).filter((key) => !state.tabs.includes(key));
}

function fragmentIndex(key: TabKey): number | null {
  const match = /^frag-(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
}

/** Short tab-bar label: 'Detalle', 'Frag. <section number>', or 'JSON'. */
export function tabLabel(key: TabKey, chunks: readonly ChunkViewModel[]): string {
  if (key === 'detail') return 'Detalle';
  if (key === 'json') return 'JSON';

  const index = fragmentIndex(key);
  const number = index !== null ? chunks[index]?.number : undefined;
  return `Frag. ${number ?? index}`;
}

/** Long-form title (tooltip / panel header): 'Detalle de la consulta', the
 * chunk's full section title, or 'JSON crudo'. */
export function tabTitle(key: TabKey, chunks: readonly ChunkViewModel[]): string {
  if (key === 'detail') return 'Detalle de la consulta';
  if (key === 'json') return 'JSON crudo';

  const index = fragmentIndex(key);
  const sectionTitle = index !== null ? chunks[index]?.sectionTitle : undefined;
  return sectionTitle ?? tabLabel(key, chunks);
}

export interface ComputeLayoutInput {
  viewportWidth: number;
  panelOpen: boolean;
  wide: boolean;
  sidebarCollapsed: boolean;
}

export interface ComputeLayoutResult {
  sidebarPx: number;
  sidebarHidden: boolean;
  /** CSS value for the panel's width — a literal formula string, not a
   * resolved pixel number (the browser resolves `vw`/`calc` at layout time). */
  panelWidth: string;
  /** Numeric resolution of `panelWidth` at `viewportWidth`, used to derive
   * `compactPanel` and by tests that assert the chat column never shrinks
   * below its minimum. */
  panelWidthPx: number;
  compactPanel: boolean;
  gridTemplateColumns: string;
}

/**
 * Resolves the 3-column grid (sidebar / chat / detail panel) for a given
 * viewport and panel state.
 *
 * - The sidebar hides when explicitly collapsed, or whenever the panel is
 *   open on a narrow viewport (< 1280px) or in wide mode — the panel then
 *   needs the room the sidebar would take.
 * - The panel's max width always leaves the chat column at least 420px,
 *   because both CSS formulas below bound the panel by
 *   `calc(100vw - sidebar - 420px)`.
 */
export function computeLayout({
  viewportWidth,
  panelOpen,
  wide,
  sidebarCollapsed,
}: ComputeLayoutInput): ComputeLayoutResult {
  const sidebarHidden = sidebarCollapsed || (panelOpen && (viewportWidth < 1280 || wide));
  const sidebarPx = sidebarHidden ? 0 : SIDEBAR_WIDTH_PX;

  const maxBoundPx = viewportWidth - sidebarPx - CHAT_MIN_WIDTH_PX;

  let panelWidth: string;
  let panelWidthPx: number;

  if (!panelOpen) {
    panelWidth = '0px';
    panelWidthPx = 0;
  } else if (wide) {
    panelWidth = `min(62vw, calc(100vw - ${sidebarPx}px - 420px))`;
    panelWidthPx = Math.min(0.62 * viewportWidth, maxBoundPx);
  } else {
    panelWidth = `clamp(${PANEL_MIN_WIDTH_PX}px, 46vw, calc(100vw - ${sidebarPx}px - 420px))`;
    panelWidthPx = Math.max(PANEL_MIN_WIDTH_PX, Math.min(0.46 * viewportWidth, maxBoundPx));
  }

  const compactPanel = panelOpen && panelWidthPx < PANEL_COMPACT_THRESHOLD_PX;
  const gridTemplateColumns = `${sidebarPx}px minmax(0,1fr) ${panelWidth}`;

  return { sidebarPx, sidebarHidden, panelWidth, panelWidthPx, compactPanel, gridTemplateColumns };
}
