import { useMemo } from 'react';
import type { askQuestionStream } from '@/features/ask/api';
import { useAsk } from '@/features/ask/useAsk';
import { type AskViewModel, toViewModel } from '@/features/ask/viewModel';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { ChatColumn } from './chat/ChatColumn';
import { DetailPanel } from './panel/DetailPanel';
import { ProjectSidebar } from './sidebar/ProjectSidebar';
import { useWorkbench } from './useWorkbench';
import { WorkbenchLayout } from './WorkbenchLayout';
import { MAX_QUESTION_LENGTH } from './workbenchReducer';
import { computeLayout, overflowTabs } from './workbenchSelectors';

export interface WorkbenchContainerProps {
  /** Injectable for tests; defaults to the real `askQuestionStream`. */
  askFn?: typeof askQuestionStream;
}

/**
 * Wires `useAsk` (domain: turns, streaming, stop) and `useWorkbench` (UI
 * state: panel/tabs/sidebar/input) together with `useViewportWidth` into
 * `computeLayout` to drive the 3-column `WorkbenchLayout`. The chat column
 * gets plain props/callbacks only — all state lives here.
 */
export function WorkbenchContainer({ askFn }: WorkbenchContainerProps) {
  const { turns, ask, isBusy, stop } = useAsk({ ask: askFn });
  const [state, actions] = useWorkbench();
  const viewportWidth = useViewportWidth();

  const viewModels = useMemo(() => {
    const map = new Map<string, AskViewModel>();
    for (const turn of turns) {
      if (turn.state === 'success') map.set(turn.id, toViewModel(turn.response));
    }
    return map;
  }, [turns]);

  const layout = computeLayout({
    viewportWidth,
    panelOpen: state.panelOpen,
    wide: state.wide,
    sidebarCollapsed: state.sidebarCollapsed,
  });

  const handleSubmit = () => {
    const question = state.input.trim();
    if (!question) return;
    actions.newQuestion();
    ask(question);
  };

  // The panel shows the explicitly focused turn, falling back to the latest
  // successful turn (e.g. right after `openPanel()` from the chat header,
  // which doesn't set a turn id).
  const focusedTurn =
    turns.find((turn) => turn.id === state.focusedTurnId && turn.state === 'success') ??
    [...turns].reverse().find((turn) => turn.state === 'success');
  const focusedViewModel = focusedTurn ? viewModels.get(focusedTurn.id) : undefined;

  const panel =
    state.panelOpen && focusedTurn && focusedTurn.state === 'success' && focusedViewModel ? (
      <DetailPanel
        viewModel={focusedViewModel}
        rawResponse={focusedTurn.response}
        tabs={state.tabs}
        active={state.active}
        overflowKeys={overflowTabs(state, focusedViewModel.chunks.length)}
        overflowOpen={state.overflowOpen}
        compact={layout.compactPanel}
        wide={state.wide}
        animKey={state.animKey}
        onActivateTab={actions.activateTab}
        onCloseTab={actions.closeTab}
        onOpenTab={(key) => actions.openTab(key, focusedTurn.id)}
        onOverflowOpenChange={actions.setOverflowOpen}
        onToggleWide={actions.toggleWide}
        onClosePanel={actions.closePanel}
      />
    ) : null;

  return (
    <WorkbenchLayout
      gridTemplateColumns={layout.gridTemplateColumns}
      sidebarHidden={layout.sidebarHidden}
      sidebar={<ProjectSidebar onCollapse={actions.toggleSidebar} />}
      panel={panel}
      chat={
        <ChatColumn
          turns={turns}
          viewModels={viewModels}
          isBusy={isBusy}
          input={state.input}
          onInputChange={actions.setInput}
          maxInputLength={MAX_QUESTION_LENGTH}
          onSubmit={handleSubmit}
          onStop={stop}
          sidebarHidden={layout.sidebarHidden}
          onShowSidebar={actions.toggleSidebar}
          panelOpen={state.panelOpen}
          focusedTurnId={state.focusedTurnId}
          citationsOpen={state.citationsOpen}
          onCitationsOpenChange={actions.setCitationsOpen}
          onOpenTab={actions.openTab}
          onOpenPanel={actions.openPanel}
          onClosePanel={actions.closePanel}
        />
      }
    />
  );
}
