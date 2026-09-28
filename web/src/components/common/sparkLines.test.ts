import { describe, expect, it } from 'vitest';
import { SPARK_COUNT, sparkLines } from './sparkLines';

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

describe('sparkLines', () => {
  it('returns 8 lines', () => {
    expect(sparkLines(0, 0, 0)).toHaveLength(SPARK_COUNT);
  });

  it('at progress 0, lines sit at the origin with the full 9px length', () => {
    const lines = sparkLines(10, 10, 0);
    for (const line of lines) {
      expect(distance(10, 10, line.x1, line.y1)).toBeCloseTo(0, 5);
      expect(distance(line.x1, line.y1, line.x2, line.y2)).toBeCloseTo(9, 5);
    }
  });

  it('at progress 1, lines have traveled the full 18px radius and shrunk to a point', () => {
    const lines = sparkLines(10, 10, 1);
    for (const line of lines) {
      expect(distance(10, 10, line.x1, line.y1)).toBeCloseTo(18, 5);
      expect(distance(line.x1, line.y1, line.x2, line.y2)).toBeCloseTo(0, 5);
    }
  });

  it('spaces the 8 lines evenly around the origin (45° apart)', () => {
    const lines = sparkLines(0, 0, 0.5);
    const angles = lines.map((line) => Math.atan2(line.y1, line.x1));
    const first = angles[0];
    const second = angles[1];
    let delta = second - first;
    if (delta < 0) delta += Math.PI * 2;
    expect(delta).toBeCloseTo(Math.PI / 4, 5);
  });

  it('clamps progress outside [0, 1]', () => {
    const below = sparkLines(0, 0, -0.5);
    const above = sparkLines(0, 0, 1.5);
    expect(distance(0, 0, below[0].x1, below[0].y1)).toBeCloseTo(0, 5);
    expect(distance(0, 0, above[0].x1, above[0].y1)).toBeCloseTo(18, 5);
  });
});
