import { describe, expect, it } from 'vitest';
import {
  initialWorkbenchState,
  MAX_QUESTION_LENGTH,
  type WorkbenchState,
  workbenchReducer,
} from './workbenchReducer';

function openTabs(state: WorkbenchState, keys: WorkbenchState['tabs']): WorkbenchState {
  return keys.reduce((acc, key) => workbenchReducer(acc, { type: 'openTab', key }), state);
}

describe('initialWorkbenchState', () => {
  it('starts with the panel closed, citations open and no focused turn', () => {
    expect(initialWorkbenchState).toEqual({
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
    });
  });
});

describe('workbenchReducer / openTab', () => {
  it('appends a new tab, activates it, opens the panel and closes overflow', () => {
    const state = workbenchReducer(initialWorkbenchState, { type: 'openTab', key: 'detail' });

    expect(state.tabs).toEqual(['detail']);
    expect(state.active).toBe('detail');
    expect(state.panelOpen).toBe(true);
    expect(state.overflowOpen).toBe(false);
    expect(state.animKey).toBe(1);
  });

  it('keeps existing order when opening an already-open tab, but still activates and bumps animKey', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0', 'json']);
    const state = workbenchReducer(
      { ...opened, active: 'json', overflowOpen: true },
      { type: 'openTab', key: 'frag-0' },
    );

    expect(state.tabs).toEqual(['detail', 'frag-0', 'json']);
    expect(state.active).toBe('frag-0');
    expect(state.overflowOpen).toBe(false);
    expect(state.animKey).toBe(opened.animKey + 1);
  });
});

describe('workbenchReducer / closeTab', () => {
  it('activates the last remaining tab when the active tab is closed', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0', 'json']);
    const withActive = { ...opened, active: 'frag-0' as const };

    const state = workbenchReducer(withActive, { type: 'closeTab', key: 'frag-0' });

    expect(state.tabs).toEqual(['detail', 'json']);
    expect(state.active).toBe('json');
    expect(state.animKey).toBe(withActive.animKey + 1);
    expect(state.panelOpen).toBe(true);
  });

  it('closes the panel and clears active/wide/overflow when the last tab is closed', () => {
    const opened = workbenchReducer(initialWorkbenchState, { type: 'openTab', key: 'detail' });
    const wideAndOpen = { ...opened, wide: true, overflowOpen: true };

    const state = workbenchReducer(wideAndOpen, { type: 'closeTab', key: 'detail' });

    expect(state.tabs).toEqual([]);
    expect(state.active).toBeNull();
    expect(state.panelOpen).toBe(false);
    expect(state.wide).toBe(false);
    expect(state.overflowOpen).toBe(false);
  });

  it('leaves active and animKey untouched when closing a non-active tab', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0', 'json']);
    const withActive = { ...opened, active: 'json' as const };

    const state = workbenchReducer(withActive, { type: 'closeTab', key: 'detail' });

    expect(state.tabs).toEqual(['frag-0', 'json']);
    expect(state.active).toBe('json');
    expect(state.animKey).toBe(withActive.animKey);
  });
});

describe('workbenchReducer / activateTab', () => {
  it('activates an already-open tab and bumps animKey', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0']);

    const state = workbenchReducer(opened, { type: 'activateTab', key: 'detail' });

    expect(state.active).toBe('detail');
    expect(state.animKey).toBe(opened.animKey + 1);
  });

  it('is a no-op when the tab is not open', () => {
    const opened = openTabs(initialWorkbenchState, ['detail']);

    const state = workbenchReducer(opened, { type: 'activateTab', key: 'json' });

    expect(state).toEqual(opened);
  });
});

describe('workbenchReducer / openPanel', () => {
  it('opens with a single "detail" tab when there are no tabs yet', () => {
    const state = workbenchReducer(initialWorkbenchState, { type: 'openPanel' });

    expect(state.tabs).toEqual(['detail']);
    expect(state.active).toBe('detail');
    expect(state.panelOpen).toBe(true);
    expect(state.animKey).toBe(1);
  });

  it('reopens with the existing tabs and active tab', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0']);
    const closed = workbenchReducer(opened, { type: 'closePanel' });

    const state = workbenchReducer(closed, { type: 'openPanel' });

    expect(state.tabs).toEqual(['detail', 'frag-0']);
    expect(state.active).toBe(closed.active);
    expect(state.panelOpen).toBe(true);
    expect(state.animKey).toBe(closed.animKey + 1);
  });
});

describe('workbenchReducer / closePanel', () => {
  it('closes the panel but keeps tabs so reopening restores them', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0']);
    const wideAndOverflow = { ...opened, wide: true, overflowOpen: true };

    const state = workbenchReducer(wideAndOverflow, { type: 'closePanel' });

    expect(state.panelOpen).toBe(false);
    expect(state.overflowOpen).toBe(false);
    expect(state.wide).toBe(false);
    expect(state.tabs).toEqual(['detail', 'frag-0']);
    expect(state.active).toBe(opened.active);
  });
});

describe('workbenchReducer / togglePanel', () => {
  it('closes an open panel', () => {
    const opened = openTabs(initialWorkbenchState, ['detail']);

    const state = workbenchReducer(opened, { type: 'togglePanel' });

    expect(state.panelOpen).toBe(false);
    expect(state.tabs).toEqual(['detail']);
  });

  it('opens a closed panel with no tabs, defaulting to "detail"', () => {
    const state = workbenchReducer(initialWorkbenchState, { type: 'togglePanel' });

    expect(state.panelOpen).toBe(true);
    expect(state.tabs).toEqual(['detail']);
    expect(state.active).toBe('detail');
  });
});

describe('workbenchReducer / misc toggles', () => {
  it('toggleWide flips wide', () => {
    const state = workbenchReducer(initialWorkbenchState, { type: 'toggleWide' });
    expect(state.wide).toBe(true);
    expect(workbenchReducer(state, { type: 'toggleWide' }).wide).toBe(false);
  });

  it('setOverflowOpen sets the flag directly', () => {
    const state = workbenchReducer(initialWorkbenchState, {
      type: 'setOverflowOpen',
      open: true,
    });
    expect(state.overflowOpen).toBe(true);
  });

  it('toggleSidebar flips sidebarCollapsed', () => {
    const state = workbenchReducer(initialWorkbenchState, { type: 'toggleSidebar' });
    expect(state.sidebarCollapsed).toBe(true);
  });

  it('setCitationsOpen sets the flag directly', () => {
    const state = workbenchReducer(initialWorkbenchState, {
      type: 'setCitationsOpen',
      open: false,
    });
    expect(state.citationsOpen).toBe(false);
  });
});

describe('workbenchReducer / setInput', () => {
  it('sets the input value', () => {
    const state = workbenchReducer(initialWorkbenchState, {
      type: 'setInput',
      value: '¿Cómo pido vacaciones?',
    });
    expect(state.input).toBe('¿Cómo pido vacaciones?');
  });

  it('truncates to MAX_QUESTION_LENGTH characters', () => {
    expect(MAX_QUESTION_LENGTH).toBe(1000);
    const long = 'a'.repeat(MAX_QUESTION_LENGTH + 50);

    const state = workbenchReducer(initialWorkbenchState, { type: 'setInput', value: long });

    expect(state.input).toHaveLength(MAX_QUESTION_LENGTH);
  });
});

describe('workbenchReducer / newQuestion', () => {
  it('resets panel/tabs/active/input/citations but keeps sidebarCollapsed', () => {
    const opened = openTabs(initialWorkbenchState, ['detail', 'frag-0']);
    const dirty = {
      ...opened,
      wide: true,
      overflowOpen: true,
      sidebarCollapsed: true,
      citationsOpen: false,
      input: 'draft question',
    };

    const state = workbenchReducer(dirty, { type: 'newQuestion' });

    expect(state.panelOpen).toBe(false);
    expect(state.tabs).toEqual([]);
    expect(state.active).toBeNull();
    expect(state.overflowOpen).toBe(false);
    expect(state.wide).toBe(false);
    expect(state.input).toBe('');
    expect(state.citationsOpen).toBe(true);
    expect(state.sidebarCollapsed).toBe(true);
  });

  it('clears focusedTurnId', () => {
    const focused = workbenchReducer(initialWorkbenchState, {
      type: 'openTab',
      key: 'detail',
      turnId: 'turn-1',
    });

    const state = workbenchReducer(focused, { type: 'newQuestion' });

    expect(state.focusedTurnId).toBeNull();
  });
});

describe('workbenchReducer / focusedTurnId', () => {
  it('openTab sets focusedTurnId when a turnId is given', () => {
    const state = workbenchReducer(initialWorkbenchState, {
      type: 'openTab',
      key: 'detail',
      turnId: 'turn-1',
    });

    expect(state.focusedTurnId).toBe('turn-1');
  });

  it('openTab leaves focusedTurnId untouched when no turnId is given', () => {
    const focused = workbenchReducer(initialWorkbenchState, {
      type: 'openTab',
      key: 'detail',
      turnId: 'turn-1',
    });

    const state = workbenchReducer(focused, { type: 'openTab', key: 'json' });

    expect(state.focusedTurnId).toBe('turn-1');
  });

  it('openPanel sets focusedTurnId when a turnId is given', () => {
    const state = workbenchReducer(initialWorkbenchState, {
      type: 'openPanel',
      turnId: 'turn-2',
    });

    expect(state.focusedTurnId).toBe('turn-2');
    expect(state.tabs).toEqual(['detail']);
  });

  it('openPanel leaves focusedTurnId untouched when no turnId is given', () => {
    const focused = workbenchReducer(initialWorkbenchState, {
      type: 'openTab',
      key: 'detail',
      turnId: 'turn-1',
    });
    const closed = workbenchReducer(focused, { type: 'closePanel' });

    const state = workbenchReducer(closed, { type: 'openPanel' });

    expect(state.focusedTurnId).toBe('turn-1');
  });

  it('re-focuses a different turn on an already-open panel', () => {
    const focused = workbenchReducer(initialWorkbenchState, {
      type: 'openTab',
      key: 'detail',
      turnId: 'turn-1',
    });

    const state = workbenchReducer(focused, {
      type: 'openTab',
      key: 'frag-0',
      turnId: 'turn-2',
    });

    expect(state.focusedTurnId).toBe('turn-2');
    expect(state.tabs).toEqual(['detail', 'frag-0']);
  });
});
