import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { sparkLines } from './sparkLines';

export interface ClickSparkProps {
  /** Default true. Disabled or `prefers-reduced-motion` renders nothing. */
  enabled?: boolean;
}

const SPARK_DURATION_MS = 420;
const SPARK_STROKE_WIDTH = 1.6;
const FALLBACK_COLOR: readonly [number, number, number] = [237, 237, 239];

interface Spark {
  x: number;
  y: number;
  startedAt: number;
}

/** Parses the `--color-spark` custom property (an `rgb(...)`/`rgba(...)`
 * string set in `index.css`) into its channels. The alpha channel is
 * ignored — `ClickSpark` drives its own fade via `progress`. */
function parseRgbChannels(value: string): readonly [number, number, number] | null {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Full-viewport canvas overlay that draws an 8-line "spark" burst at every
 * pointerdown, reusing the pure geometry from `sparkLines`. The `--color-
 * spark` CSS variable is read once via `getComputedStyle`, never hardcoded.
 */
export function ClickSpark({ enabled = true }: ClickSparkProps) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | null>(null);
  const colorRef = useRef<readonly [number, number, number] | null>(null);

  const active = enabled && !reducedMotion;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Arrow functions assigned to `const` (not `function` declarations) so
    // TypeScript's closure narrowing keeps `canvas`/`ctx` non-null here —
    // see the TS 4.4 "aliased const in closures" narrowing rule.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      sparksRef.current = sparksRef.current.filter((spark) => {
        const progress = (now - spark.startedAt) / SPARK_DURATION_MS;
        if (progress >= 1) return false;

        if (!colorRef.current) {
          colorRef.current =
            parseRgbChannels(
              getComputedStyle(document.documentElement).getPropertyValue('--color-spark'),
            ) ?? FALLBACK_COLOR;
        }
        const [r, g, b] = colorRef.current;
        const alpha = 1 - progress;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = SPARK_STROKE_WIDTH;
        ctx.lineCap = 'round';
        for (const line of sparkLines(spark.x, spark.y, progress)) {
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.stroke();
        }
        return true;
      });

      rafRef.current = sparksRef.current.length > 0 ? requestAnimationFrame(draw) : null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      sparksRef.current.push({ x: event.clientX, y: event.clientY, startedAt: performance.now() });
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      sparksRef.current = [];
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[9999]" />;
}
