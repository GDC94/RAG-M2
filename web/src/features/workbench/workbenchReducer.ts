/**
 * Pure UI-state reducer for the workbench detail panel: which tabs are open,
 * which one is active, the panel's open/wide/overflow flags, the sidebar's
 * collapsed flag, the citations-drawer flag, and the composer's draft input.
 *
 * Request/pipeline state (loading, stages, elapsed, response) stays in
 * `useAsk` — this module never duplicates it.
 */

export const MAX_QUESTION_LENGTH = 1000;

/** `frag-${n}` is a 0-based index into the current turn's retrieved chunks
 * (the backend returns 0..3), not the chunk's own section number. */
export type TabKey = 'detail' | `frag-${number}` | 'json';

export interface WorkbenchState {
  panelOpen: boolean;
  wide: boolean;
  tabs: TabKey[];
  active: TabKey | null;
  overflowOpen: boolean;
  sidebarCollapsed: boolean;
  citationsOpen: boolean;
  input: string;
  animKey: number;
  /** The turn whose response the detail panel (phase 5) shows. Set by
   * `openTab`/`openPanel` when called with a `turnId`; cleared by
   * `newQuestion`. */
  focusedTurnId: string | null;
}

export const initialWorkbenchState: WorkbenchState = {
  panelOpen: false,
  wide: false,
  tabs: [],
  active: null,
  overflowOpen: false,
  sidebarCollapsed: false,
  citationsOpen: true,
  input: '',
  animKey: 0,
  focusedTurnId: null,
};

export type WorkbenchAction =
  | { type: 'openTab'; key: TabKey; turnId?: string }
  | { type: 'closeTab'; key: TabKey }
  | { type: 'activateTab'; key: TabKey }
  | { type: 'openPanel'; turnId?: string }
  | { type: 'closePanel' }
  | { type: 'togglePanel' }
  | { type: 'toggleWide' }
  | { type: 'setOverflowOpen'; open: boolean }
  | { type: 'toggleSidebar' }
  | { type: 'setCitationsOpen'; open: boolean }
  | { type: 'setInput'; value: string }
  | { type: 'newQuestion' };

function closePanelState(state: WorkbenchState): WorkbenchState {
  return { ...state, panelOpen: false, overflowOpen: false, wide: false };
}

/** Opens the panel: starts a single "detail" tab when nothing is open yet,
 * otherwise reopens with whatever tabs/active tab were already there. */
function openPanelState(state: WorkbenchState, turnId?: string): WorkbenchState {
  const focusedTurnId = turnId ?? state.focusedTurnId;
  if (state.tabs.length === 0) {
    return {
      ...state,
      tabs: ['detail'],
      active: 'detail',
      panelOpen: true,
      animKey: state.animKey + 1,
      focusedTurnId,
    };
  }
  return { ...state, panelOpen: true, animKey: state.animKey + 1, focusedTurnId };
}

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'openTab': {
      const tabs = state.tabs.includes(action.key) ? state.tabs : [...state.tabs, action.key];
      return {
        ...state,
        tabs,
        active: action.key,
        panelOpen: true,
        overflowOpen: false,
        animKey: state.animKey + 1,
        focusedTurnId: action.turnId ?? state.focusedTurnId,
      };
    }

    case 'closeTab': {
      const tabs = state.tabs.filter((key) => key !== action.key);
      const wasActive = state.active === action.key;

      if (tabs.length === 0) {
        return {
          ...state,
          tabs,
          active: null,
          panelOpen: false,
          wide: false,
          overflowOpen: false,
        };
      }

      if (wasActive) {
        return {
          ...state,
          tabs,
          active: tabs[tabs.length - 1],
          animKey: state.animKey + 1,
        };
      }

      return { ...state, tabs };
    }

    case 'activateTab': {
      if (!state.tabs.includes(action.key)) return state;
      return { ...state, active: action.key, animKey: state.animKey + 1 };
    }

    case 'openPanel':
      return openPanelState(state, action.turnId);

    case 'closePanel':
      return closePanelState(state);

    case 'togglePanel':
      return state.panelOpen ? closePanelState(state) : openPanelState(state);

    case 'toggleWide':
      return { ...state, wide: !state.wide };

    case 'setOverflowOpen':
      return { ...state, overflowOpen: action.open };

    case 'toggleSidebar':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'setCitationsOpen':
      return { ...state, citationsOpen: action.open };

    case 'setInput':
      return { ...state, input: action.value.slice(0, MAX_QUESTION_LENGTH) };

    case 'newQuestion':
      return {
        ...state,
        panelOpen: false,
        tabs: [],
        active: null,
        overflowOpen: false,
        wide: false,
        input: '',
        citationsOpen: true,
        focusedTurnId: null,
      };

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
