/** Pure geometry for the `ClickSpark` canvas burst — no DOM/canvas access,
 * so it's cheap to unit-test independently of drawing. */

export interface SparkLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const SPARK_COUNT = 8;
const SPARK_RADIUS_PX = 18;
const SPARK_LENGTH_PX = 9;

/**
 * One animation frame of the burst: 8 lines radiating from `(x, y)`, each
 * traveling outward to `SPARK_RADIUS_PX` while shrinking from
 * `SPARK_LENGTH_PX` down to 0, as `progress` goes 0 → 1.
 */
export function sparkLines(x: number, y: number, progress: number): SparkLine[] {
  const clamped = Math.min(1, Math.max(0, progress));
  const distance = clamped * SPARK_RADIUS_PX;
  const length = SPARK_LENGTH_PX * (1 - clamped);

  return Array.from({ length: SPARK_COUNT }, (_, index) => {
    const angle = (index / SPARK_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: x + distance * cos,
      y1: y + distance * sin,
      x2: x + (distance + length) * cos,
      y2: y + (distance + length) * sin,
    };
  });
}
