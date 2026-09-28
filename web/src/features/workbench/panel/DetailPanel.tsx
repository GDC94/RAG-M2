import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { QueryResponse } from '@/features/ask/schemas';
import type { AskViewModel, ChunkViewModel } from '@/features/ask/viewModel';
import type { TabKey } from '@/features/workbench/workbenchReducer';
import { PanelTabs } from './components/PanelTabs';
import { DetailTab } from './DetailTab';
import { FragmentTab } from './FragmentTab';
import { JsonTab } from './JsonTab';

export interface DetailPanelProps {
  viewModel: AskViewModel;
  rawResponse: QueryResponse;
  tabs: readonly TabKey[];
  active: TabKey | null;
  overflowKeys: readonly TabKey[];
  overflowOpen: boolean;
  compact: boolean;
  wide: boolean;
  /** Replay trigger for this content's fade-in and its `ScoreRing`s/
   * `TimingsGantt` — see `useReplayValue`. */
  animKey: number;
  onActivateTab: (key: TabKey) => void;
  onCloseTab: (key: TabKey) => void;
  onOpenTab: (key: TabKey) => void;
  onOverflowOpenChange: (open: boolean) => void;
  onToggleWide: () => void;
  onClosePanel: () => void;
}

function fragmentIndex(key: TabKey): number | null {
  const match = /^frag-(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
}

function chunkForTab(key: TabKey, chunks: readonly ChunkViewModel[]): ChunkViewModel | undefined {
  const index = fragmentIndex(key);
  return index !== null ? chunks[index] : undefined;
}

export function DetailPanel({
  viewModel,
  rawResponse,
  tabs,
  active,
  overflowKeys,
  overflowOpen,
  compact,
  wide,
  animKey,
  onActivateTab,
  onCloseTab,
  onOpenTab,
  onOverflowOpenChange,
  onToggleWide,
  onClosePanel,
}: DetailPanelProps) {
  const reduce = useReducedMotion() ?? false;

  const openFragmentTab = (chunk: ChunkViewModel) => onOpenTab(`frag-${chunk.tone}`);

  let content: ReactNode = null;
  if (active === 'detail') {
    content = (
      <DetailTab
        viewModel={viewModel}
        animKey={animKey}
        onOpenFragment={openFragmentTab}
        onOpenJson={() => onOpenTab('json')}
      />
    );
  } else if (active === 'json') {
    content = <JsonTab data={rawResponse} />;
  } else if (active !== null) {
    content = (
      <FragmentTab
        chunk={chunkForTab(active, viewModel.chunks)}
        onMissing={() => onCloseTab(active)}
      />
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-ink-0">
      <PanelTabs
        tabs={tabs}
        active={active}
        overflowKeys={overflowKeys}
        chunks={viewModel.chunks}
        overflowOpen={overflowOpen}
        onOverflowOpenChange={onOverflowOpenChange}
        compact={compact}
        wide={wide}
        onActivate={onActivateTab}
        onClose={onCloseTab}
        onOpen={onOpenTab}
        onToggleWide={onToggleWide}
        onClosePanel={onClosePanel}
      />

      <motion.div
        key={animKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.35, delay: 0.1 }}
        className="flex min-h-0 flex-1 flex-col *:min-h-0 *:flex-1"
      >
        {content}
      </motion.div>
    </div>
  );
}
