/**
 * Static class-string maps for color-by-index/color-by-key UI (fragment
 * cards, pipeline stages, tech tags, verdict tags). Every class name is a
 * literal string here so Tailwind's scanner can detect it — components must
 * never build these class names dynamically (e.g. `bg-accent-${n}`).
 */

export interface ColorTone {
  /** Tinted surface: translucent background, translucent border, solid text. */
  tint: string;
  /** Solid fill, e.g. for a `ColorDot`/`ColorSquare`. */
  solid: string;
  /** SVG `stroke`, e.g. for a `ScoreRing` arc. */
  stroke: string;
  /** Text-only color. */
  text: string;
}

export interface TechTone {
  /** Tinted surface: translucent background, translucent border, solid text. */
  tint: string;
  /** Hover background for interactive tech tags. */
  hover: string;
}

/** Fragment cards are colored by their 0-based rank among the (at most 3)
 * retrieved chunks, cycling through accent-1..3. */
export const FRAGMENT_TONES: readonly ColorTone[] = [
  {
    tint: 'bg-accent-1/12 border-accent-1/30 text-accent-1',
    solid: 'bg-accent-1',
    stroke: 'stroke-accent-1',
    text: 'text-accent-1',
  },
  {
    tint: 'bg-accent-2/12 border-accent-2/30 text-accent-2',
    solid: 'bg-accent-2',
    stroke: 'stroke-accent-2',
    text: 'text-accent-2',
  },
  {
    tint: 'bg-accent-3/12 border-accent-3/30 text-accent-3',
    solid: 'bg-accent-3',
    stroke: 'stroke-accent-3',
    text: 'text-accent-3',
  },
];

export type PipelineStage = 'embed' | 'search' | 'generate' | 'verify';

export const STAGE_NAMES: readonly PipelineStage[] = ['embed', 'search', 'generate', 'verify'];

export const STAGE_TONES: Record<PipelineStage, ColorTone> = {
  embed: FRAGMENT_TONES[0],
  search: FRAGMENT_TONES[1],
  generate: FRAGMENT_TONES[2],
  verify: {
    tint: 'bg-accent-4/12 border-accent-4/30 text-accent-4',
    solid: 'bg-accent-4',
    stroke: 'stroke-accent-4',
    text: 'text-accent-4',
  },
};

export type TechName =
  | 'python'
  | 'pydantic'
  | 'openai'
  | 'chroma'
  | 'fastapi'
  | 'typescript'
  | 'react'
  | 'vite'
  | 'tailwind'
  | 'zod';

export const TECH_NAMES: readonly TechName[] = [
  'python',
  'pydantic',
  'openai',
  'chroma',
  'fastapi',
  'typescript',
  'react',
  'vite',
  'tailwind',
  'zod',
];

export const TECH_TONES: Record<TechName, TechTone> = {
  python: {
    tint: 'bg-tech-python/12 border-tech-python/30 text-tech-python',
    hover: 'hover:bg-tech-python/18',
  },
  pydantic: {
    tint: 'bg-tech-pydantic/12 border-tech-pydantic/30 text-tech-pydantic',
    hover: 'hover:bg-tech-pydantic/18',
  },
  openai: {
    tint: 'bg-tech-openai/12 border-tech-openai/30 text-tech-openai',
    hover: 'hover:bg-tech-openai/18',
  },
  typescript: {
    tint: 'bg-tech-typescript/12 border-tech-typescript/30 text-tech-typescript',
    hover: 'hover:bg-tech-typescript/18',
  },
  react: {
    tint: 'bg-tech-react/12 border-tech-react/30 text-tech-react',
    hover: 'hover:bg-tech-react/18',
  },
  vite: {
    tint: 'bg-tech-vite/12 border-tech-vite/30 text-tech-vite',
    hover: 'hover:bg-tech-vite/18',
  },
  tailwind: {
    tint: 'bg-tech-tailwind/12 border-tech-tailwind/30 text-tech-tailwind',
    hover: 'hover:bg-tech-tailwind/18',
  },
  zod: {
    tint: 'bg-tech-zod/12 border-tech-zod/30 text-tech-zod',
    hover: 'hover:bg-tech-zod/18',
  },
  chroma: {
    tint: 'bg-tech-chroma/12 border-tech-chroma/30 text-tech-chroma',
    hover: 'hover:bg-tech-chroma/18',
  },
  fastapi: {
    tint: 'bg-tech-fastapi/12 border-tech-fastapi/30 text-tech-fastapi',
    hover: 'hover:bg-tech-fastapi/18',
  },
};

export type VerdictKey = 'supported' | 'partial' | 'unsupported' | 'wrong_status';

export const VERDICT_KEYS: readonly VerdictKey[] = [
  'supported',
  'partial',
  'unsupported',
  'wrong_status',
];

/** `supported` shares accent-4 with the `verify` pipeline stage (both mean
 * "the verifier is satisfied"). `wrong_status` has no accent color of its
 * own — it flags an answer/status mismatch rather than a quality judgement. */
export const VERDICT_TONES: Record<VerdictKey, ColorTone> = {
  supported: STAGE_TONES.verify,
  partial: FRAGMENT_TONES[2],
  unsupported: FRAGMENT_TONES[1],
  wrong_status: {
    tint: 'bg-fg-muted/12 border-fg-muted/30 text-fg-muted',
    solid: 'bg-fg-muted',
    stroke: 'stroke-fg-muted',
    text: 'text-fg-muted',
  },
};
