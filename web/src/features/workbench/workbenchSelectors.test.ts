import { describe, expect, it } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { initialWorkbenchState, type WorkbenchState } from './workbenchReducer';
import {
  availableTabs,
  computeLayout,
  overflowTabs,
  tabLabel,
  tabTitle,
} from './workbenchSelectors';

function chunk(overrides: Partial<ChunkViewModel>): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.9,
    body: 'body',
    preview: 'preview',
    cited: false,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

describe('availableTabs', () => {
  it('lists detail, one frag-N per chunk, then json', () => {
    expect(availableTabs(3)).toEqual(['detail', 'frag-0', 'frag-1', 'frag-2', 'json']);
  });

  it('lists just detail/json when there are no chunks', () => {
    expect(availableTabs(0)).toEqual(['detail', 'json']);
  });
});

describe('overflowTabs', () => {
  it('returns available tabs minus the open ones, in available order', () => {
    const state: WorkbenchState = { ...initialWorkbenchState, tabs: ['json', 'frag-1'] };

    expect(overflowTabs(state, 2)).toEqual(['detail', 'frag-0']);
  });

  it('is empty once every available tab is open', () => {
    const state: WorkbenchState = {
      ...initialWorkbenchState,
      tabs: ['detail', 'frag-0', 'json'],
    };

    expect(overflowTabs(state, 1)).toEqual([]);
  });
});

describe('tabLabel', () => {
  it('labels detail and json', () => {
    expect(tabLabel('detail', [])).toBe('Detalle');
    expect(tabLabel('json', [])).toBe('JSON');
  });

  it('labels a fragment tab with the chunk section number', () => {
    const chunks = [chunk({ number: 19 }), chunk({ number: 22, id: 'alba-manual::22' })];

    expect(tabLabel('frag-0', chunks)).toBe('Frag. 19');
    expect(tabLabel('frag-1', chunks)).toBe('Frag. 22');
  });
});

describe('tabTitle', () => {
  it('gives the long-form titles', () => {
    const chunks = [chunk({ sectionTitle: '19. Cómo solicitar vacaciones' })];

    expect(tabTitle('detail', chunks)).toBe('Detalle de la consulta');
    expect(tabTitle('frag-0', chunks)).toBe('19. Cómo solicitar vacaciones');
    expect(tabTitle('json', chunks)).toBe('JSON crudo');
  });
});

describe('computeLayout', () => {
  const SIDEBAR = 272;

  it('collapses the sidebar and zeroes the panel when the panel is closed', () => {
    const layout = computeLayout({
      viewportWidth: 1440,
      panelOpen: false,
      wide: false,
      sidebarCollapsed: false,
    });

    expect(layout.sidebarPx).toBe(SIDEBAR);
    expect(layout.sidebarHidden).toBe(false);
    expect(layout.panelWidth).toBe('0px');
    expect(layout.compactPanel).toBe(false);
    expect(layout.gridTemplateColumns).toBe(`${SIDEBAR}px minmax(0,1fr) 0px`);
  });

  it('hides the sidebar whenever sidebarCollapsed is set, panel state notwithstanding', () => {
    const layout = computeLayout({
      viewportWidth: 1440,
      panelOpen: false,
      wide: false,
      sidebarCollapsed: true,
    });

    expect(layout.sidebarHidden).toBe(true);
    expect(layout.sidebarPx).toBe(0);
  });

  it.each([
    { viewportWidth: 924, wide: false },
    { viewportWidth: 1280, wide: false },
    { viewportWidth: 1440, wide: false },
    { viewportWidth: 924, wide: true },
    { viewportWidth: 1280, wide: true },
    { viewportWidth: 1440, wide: true },
  ])(
    'keeps the chat column at >= 420px at $viewportWidth (wide=$wide)',
    ({ viewportWidth, wide }) => {
      const layout = computeLayout({
        viewportWidth,
        panelOpen: true,
        wide,
        sidebarCollapsed: false,
      });

      expect(Number.isNaN(layout.panelWidthPx)).toBe(false);

      const chatWidth = viewportWidth - layout.sidebarPx - layout.panelWidthPx;
      expect(chatWidth).toBeGreaterThanOrEqual(420);
    },
  );

  it('hides the sidebar under 1280px when the panel is open', () => {
    const layout = computeLayout({
      viewportWidth: 924,
      panelOpen: true,
      wide: false,
      sidebarCollapsed: false,
    });

    expect(layout.sidebarHidden).toBe(true);
    expect(layout.sidebarPx).toBe(0);
  });

  it('keeps the sidebar visible at >= 1280px with the panel open and not wide', () => {
    const layout = computeLayout({
      viewportWidth: 1280,
      panelOpen: true,
      wide: false,
      sidebarCollapsed: false,
    });

    expect(layout.sidebarHidden).toBe(false);
    expect(layout.sidebarPx).toBe(SIDEBAR);
  });

  it('hides the sidebar when wide, even at a large viewport', () => {
    const layout = computeLayout({
      viewportWidth: 1440,
      panelOpen: true,
      wide: true,
      sidebarCollapsed: false,
    });

    expect(layout.sidebarHidden).toBe(true);
  });

  it('marks the panel compact once its resolved width drops below 600px', () => {
    const narrow = computeLayout({
      viewportWidth: 924,
      panelOpen: true,
      wide: false,
      sidebarCollapsed: false,
    });
    const wide = computeLayout({
      viewportWidth: 1440,
      panelOpen: true,
      wide: false,
      sidebarCollapsed: false,
    });

    expect(narrow.compactPanel).toBe(true);
    expect(wide.compactPanel).toBe(false);
  });

  it('returns a numeric CSS panel width string, using clamp semantics for the non-wide case', () => {
    // viewport 1280, panel open, not wide, sidebar visible (272px):
    // maxBound = 1280 - 272 - 420 = 588; 46vw = 588.8 -> clamp(340, 588.8, 588) = 588
    const layout = computeLayout({
      viewportWidth: 1280,
      panelOpen: true,
      wide: false,
      sidebarCollapsed: false,
    });

    expect(layout.panelWidth).toBe('clamp(340px, 46vw, calc(100vw - 272px - 420px))');
    expect(layout.panelWidthPx).toBe(588);
  });

  it('returns a min()-based CSS panel width string for the wide case', () => {
    const layout = computeLayout({
      viewportWidth: 1440,
      panelOpen: true,
      wide: true,
      sidebarCollapsed: false,
    });

    expect(layout.panelWidth).toBe('min(62vw, calc(100vw - 0px - 420px))');
    expect(layout.panelWidthPx).toBeCloseTo(892.8);
  });
});
