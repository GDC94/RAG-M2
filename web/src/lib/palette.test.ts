import { describe, expect, it } from 'vitest';
import {
  FRAGMENT_TONES,
  STAGE_NAMES,
  STAGE_TONES,
  TECH_NAMES,
  TECH_TONES,
  VERDICT_KEYS,
  VERDICT_TONES,
} from './palette';

describe('FRAGMENT_TONES', () => {
  it('has one tone per possible fragment rank (0..2)', () => {
    expect(FRAGMENT_TONES).toHaveLength(3);
  });

  it('every entry resolves to a tint/solid/stroke/text class string', () => {
    for (const tone of FRAGMENT_TONES) {
      expect(tone.tint).toMatch(/^bg-accent-\d+\/12 border-accent-\d+\/30 text-accent-\d+$/);
      expect(tone.solid).toMatch(/^bg-accent-\d+$/);
      expect(tone.stroke).toMatch(/^stroke-accent-\d+$/);
      expect(tone.text).toMatch(/^text-accent-\d+$/);
    }
  });

  it('cycles through accent-1, accent-2, accent-3 in order', () => {
    expect(FRAGMENT_TONES[0].solid).toBe('bg-accent-1');
    expect(FRAGMENT_TONES[1].solid).toBe('bg-accent-2');
    expect(FRAGMENT_TONES[2].solid).toBe('bg-accent-3');
  });
});

describe('STAGE_TONES', () => {
  it('resolves every stage name to a tone', () => {
    for (const stage of STAGE_NAMES) {
      expect(STAGE_TONES[stage]).toBeDefined();
    }
  });

  it('maps embed/search/generate onto accent-1/2/3 and verify onto accent-4', () => {
    expect(STAGE_TONES.embed.solid).toBe('bg-accent-1');
    expect(STAGE_TONES.search.solid).toBe('bg-accent-2');
    expect(STAGE_TONES.generate.solid).toBe('bg-accent-3');
    expect(STAGE_TONES.verify.solid).toBe('bg-accent-4');
  });
});

describe('TECH_TONES', () => {
  it('resolves every documented tech name to a tint + hover class string', () => {
    expect(TECH_NAMES).toHaveLength(10);
    for (const tech of TECH_NAMES) {
      const tone = TECH_TONES[tech];
      expect(tone).toBeDefined();
      expect(tone.tint).toContain(`bg-tech-${tech}/12`);
      expect(tone.tint).toContain(`text-tech-${tech}`);
      expect(tone.hover).toBe(`hover:bg-tech-${tech}/18`);
    }
  });
});

describe('VERDICT_TONES', () => {
  it('resolves every verdict key to a tone', () => {
    expect(VERDICT_KEYS).toHaveLength(4);
    for (const key of VERDICT_KEYS) {
      expect(VERDICT_TONES[key]).toBeDefined();
    }
  });

  it('shares accent-4 between the supported verdict and the verify stage', () => {
    expect(VERDICT_TONES.supported.solid).toBe('bg-accent-4');
  });
});
