import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWorkbench } from './useWorkbench';
import { initialWorkbenchState } from './workbenchReducer';

describe('useWorkbench', () => {
  it('starts at initialWorkbenchState', () => {
    const { result } = renderHook(() => useWorkbench());
    const [state] = result.current;

    expect(state).toEqual(initialWorkbenchState);
  });

  it('dispatches openTab and re-renders with the updated state', () => {
    const { result } = renderHook(() => useWorkbench());

    act(() => {
      result.current[1].openTab('detail');
    });

    const [state] = result.current;
    expect(state.tabs).toEqual(['detail']);
    expect(state.active).toBe('detail');
    expect(state.panelOpen).toBe(true);
  });

  it('keeps stable action-creator identities across re-renders', () => {
    const { result, rerender } = renderHook(() => useWorkbench());
    const firstActions = result.current[1];

    rerender();
    const secondActions = result.current[1];

    expect(secondActions).toBe(firstActions);
  });

  it('exposes every reducer action', () => {
    const { result } = renderHook(() => useWorkbench());

    act(() => {
      result.current[1].openTab('frag-0');
      result.current[1].toggleWide();
      result.current[1].setOverflowOpen(true);
      result.current[1].toggleSidebar();
      result.current[1].setCitationsOpen(false);
      result.current[1].setInput('hola');
      result.current[1].activateTab('frag-0');
      result.current[1].closeTab('frag-0');
      result.current[1].openPanel();
      result.current[1].closePanel();
      result.current[1].togglePanel();
      result.current[1].newQuestion();
    });

    const [state] = result.current;
    expect(state.tabs).toEqual([]);
    expect(state.input).toBe('');
    expect(state.citationsOpen).toBe(true);
    expect(state.sidebarCollapsed).toBe(true);
  });
});
