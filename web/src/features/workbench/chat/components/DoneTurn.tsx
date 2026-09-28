import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { AskViewModel, ChunkViewModel } from '@/features/ask/viewModel';
import type { TabKey } from '@/features/workbench/workbenchReducer';
import { EASE_OUT } from '@/lib/ease';
import { AnswerBlock } from './AnswerBlock';
import { DetailCard } from './DetailCard';
import { SourcesList } from './SourcesList';

export interface DoneTurnProps {
  viewModel: AskViewModel;
  turnId: string;
  /** Client-side elapsed seconds, used only when `viewModel.timings` is null. */
  clientElapsedSeconds: number;
  /** Whether the detail panel is open and focused on this turn. */
  panelOpenForThisTurn: boolean;
  citationsOpen: boolean;
  onCitationsOpenChange: (open: boolean) => void;
  onOpenTab: (key: TabKey, turnId: string) => void;
  onClosePanel: () => void;
}

function containerVariants(reduce: boolean): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12 } },
  };
}

function itemVariants(reduce: boolean): Variants {
  return reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
      };
}

/** A resolved (`success`) turn's body: elapsed time, the answer, its
 * sources, and the detail-panel summary card. Entries stagger in. */
export function DoneTurn({
  viewModel,
  turnId,
  clientElapsedSeconds,
  panelOpenForThisTurn,
  citationsOpen,
  onCitationsOpenChange,
  onOpenTab,
  onClosePanel,
}: DoneTurnProps) {
  const reduce = useReducedMotion() ?? false;
  const workedSeconds = viewModel.timings
    ? Math.round(viewModel.timings.totalMs / 1000)
    : clientElapsedSeconds;

  const openFragmentTab = (chunk: ChunkViewModel) => {
    onOpenTab(`frag-${chunk.tone}`, turnId);
  };

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={containerVariants(reduce)}
      initial="hidden"
      animate="show"
    >
      <motion.p variants={itemVariants(reduce)} className="text-sm text-fg-subtle">
        Trabajó {workedSeconds} s
      </motion.p>

      <motion.div variants={itemVariants(reduce)}>
        <AnswerBlock
          answer={viewModel.answer}
          status={viewModel.status}
          isAnswered={viewModel.isAnswered}
          citedChunks={viewModel.citedChunks}
          onCiteClick={openFragmentTab}
        />
      </motion.div>

      {viewModel.isAnswered && viewModel.chunks.length > 0 && (
        <motion.div variants={itemVariants(reduce)}>
          <SourcesList
            chunks={viewModel.chunks}
            open={citationsOpen}
            onOpenChange={onCitationsOpenChange}
            onSelect={openFragmentTab}
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants(reduce)}>
        <DetailCard
          chunks={viewModel.chunks}
          verdict={viewModel.verdict}
          totalMs={viewModel.timings?.totalMs ?? null}
          open={panelOpenForThisTurn}
          onToggle={() => (panelOpenForThisTurn ? onClosePanel() : onOpenTab('detail', turnId))}
        />
      </motion.div>
    </motion.div>
  );
}
