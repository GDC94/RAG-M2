import { useReplayValue } from '@/hooks/useReplayValue';
import type { ColorTone } from '@/lib/palette';
import { cn } from '@/lib/utils';

const SIZE = 56;
const RADIUS = 22;
const STROKE_WIDTH = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface ScoreRingProps {
  /** Similarity score in `0..1`. */
  score: number;
  /** Palette tone for this chunk's rank, e.g. `FRAGMENT_TONES[chunk.tone]`. */
  tone: ColorTone;
  /** Replay trigger — see `useReplayValue`. */
  animKey: number;
  className?: string;
}

/** 56px ring showing a chunk's similarity score: a track circle plus a
 * progress arc that fills from 0 to `score` on mount/replay, with the
 * rounded score centered as mono text. */
export function ScoreRing({ score, tone, animKey, className }: ScoreRingProps) {
  const animatedScore = useReplayValue(score, animKey);
  const strokeDashoffset = CIRCUMFERENCE * (1 - animatedScore);

  return (
    <div
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        aria-hidden="true"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        <title>Puntaje de similitud</title>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          className="fill-none stroke-ink-300"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          className={cn(
            'fill-none [stroke-linecap:round] transition-[stroke-dashoffset] duration-[1100ms] ease-layout',
            tone.stroke,
          )}
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset }}
        />
      </svg>
      <span className="absolute font-mono text-fg-soft text-xs">{score.toFixed(2)}</span>
    </div>
  );
}
