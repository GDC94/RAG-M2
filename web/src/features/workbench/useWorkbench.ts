import { useMemo, useReducer } from 'react';
import {
  initialWorkbenchState,
  type TabKey,
  type WorkbenchState,
  workbenchReducer,
} from './workbenchReducer';

export interface WorkbenchActions {
  openTab: (key: TabKey, turnId?: string) => void;
  closeTab: (key: TabKey) => void;
  activateTab: (key: TabKey) => void;
  openPanel: (turnId?: string) => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleWide: () => void;
  setOverflowOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCitationsOpen: (open: boolean) => void;
  setInput: (value: string) => void;
  newQuestion: () => void;
}

/** Thin wrapper over `workbenchReducer` with memoized, stable action
 * creators, so consumers can destructure `[state, actions]` without actions
 * changing identity across renders. */
export function useWorkbench(): [WorkbenchState, WorkbenchActions] {
  const [state, dispatch] = useReducer(workbenchReducer, initialWorkbenchState);

  const actions = useMemo<WorkbenchActions>(
    () => ({
      openTab: (key, turnId) => dispatch({ type: 'openTab', key, turnId }),
      closeTab: (key) => dispatch({ type: 'closeTab', key }),
      activateTab: (key) => dispatch({ type: 'activateTab', key }),
      openPanel: (turnId) => dispatch({ type: 'openPanel', turnId }),
      closePanel: () => dispatch({ type: 'closePanel' }),
      togglePanel: () => dispatch({ type: 'togglePanel' }),
      toggleWide: () => dispatch({ type: 'toggleWide' }),
      setOverflowOpen: (open) => dispatch({ type: 'setOverflowOpen', open }),
      toggleSidebar: () => dispatch({ type: 'toggleSidebar' }),
      setCitationsOpen: (open) => dispatch({ type: 'setCitationsOpen', open }),
      setInput: (value) => dispatch({ type: 'setInput', value }),
      newQuestion: () => dispatch({ type: 'newQuestion' }),
    }),
    [],
  );

  return [state, actions];
}
