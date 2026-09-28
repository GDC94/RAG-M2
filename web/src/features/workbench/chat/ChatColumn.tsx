import { useRef } from 'react';
import { MessageScroller } from '@/components/agents/message-scroller';
import type { Turn } from '@/features/ask/useAsk';
import type { AskViewModel } from '@/features/ask/viewModel';
import type { TabKey } from '@/features/workbench/workbenchReducer';
import { useScrollFade } from '@/hooks/useScrollFade';
import { cn } from '@/lib/utils';
import { ChatHeader } from './components/ChatHeader';
import { ChatTurn } from './components/ChatTurn';
import { Composer } from './components/Composer';
import { ExampleChips } from './components/ExampleChips';

export interface ChatColumnProps {
  turns: Turn[];
  /** Pre-computed view models for `success` turns, keyed by turn id (see
   * `toViewModel` in `features/ask/viewModel.ts`). */
  viewModels: Map<string, AskViewModel>;
  isBusy: boolean;
  input: string;
  onInputChange: (value: string) => void;
  maxInputLength: number;
  /** Reads the current `input` itself — called with no arguments. */
  onSubmit: () => void;
  onStop: () => void;
  sidebarHidden: boolean;
  onShowSidebar: () => void;
  panelOpen: boolean;
  focusedTurnId: string | null;
  citationsOpen: boolean;
  onCitationsOpenChange: (open: boolean) => void;
  onOpenTab: (key: TabKey, turnId: string) => void;
  onOpenPanel: (turnId: string) => void;
  onClosePanel: () => void;
}

/**
 * The chat column: header, scrollable turn transcript, and the bottom
 * composer/example-chips area. Purely presentational — all domain state
 * (`useAsk`) and UI state (`useWorkbench`) is wired in by
 * `WorkbenchContainer`.
 */
export function ChatColumn({
  turns,
  viewModels,
  isBusy,
  input,
  onInputChange,
  maxInputLength,
  onSubmit,
  onStop,
  sidebarHidden,
  onShowSidebar,
  panelOpen,
  focusedTurnId,
  citationsOpen,
  onCitationsOpenChange,
  onOpenTab,
  onOpenPanel,
  onClosePanel,
}: ChatColumnProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { onScroll, fadeTop, fadeBottom } = useScrollFade();
  const latestTurn = turns[turns.length - 1];
  const showOpenPanelButton = Boolean(latestTurn) && latestTurn.state === 'success' && !panelOpen;

  const handleExampleSelect = (question: string) => {
    onInputChange(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full min-w-0 flex-col border-l border-ink-300 bg-ink-150">
      <ChatHeader
        sidebarHidden={sidebarHidden}
        onShowSidebar={onShowSidebar}
        showOpenPanelButton={showOpenPanelButton}
        onOpenPanel={() => latestTurn && onOpenPanel(latestTurn.id)}
      />

      <MessageScroller
        label="Conversación"
        busy={isBusy}
        className={cn(
          'mask-fade-y min-h-0 flex-1',
          fadeTop && 'fade-top',
          fadeBottom && 'fade-bottom',
        )}
        viewportProps={{ onScroll }}
        contentClassName="mx-auto flex w-full max-w-[760px] flex-col gap-14 px-6 pt-10 pb-14 text-base"
      >
        {turns.map((turn) => (
          <ChatTurn
            key={turn.id}
            turn={turn}
            viewModel={viewModels.get(turn.id)}
            panelOpenForThisTurn={panelOpen && focusedTurnId === turn.id}
            citationsOpen={citationsOpen}
            onCitationsOpenChange={onCitationsOpenChange}
            onOpenTab={onOpenTab}
            onClosePanel={onClosePanel}
          />
        ))}
      </MessageScroller>

      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-6 pt-5 pb-6">
        {!isBusy && <ExampleChips onSelect={handleExampleSelect} />}
        <Composer
          value={input}
          onValueChange={onInputChange}
          isBusy={isBusy}
          onSubmit={onSubmit}
          onStop={onStop}
          maxLength={maxInputLength}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
