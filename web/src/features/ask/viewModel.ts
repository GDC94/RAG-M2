import { type AnswerStatus, type QueryResponse, STAGE_NAMES, type StageName } from './schemas';

export interface ChunkViewModel {
  id: string;
  docLabel: string;
  number: number;
  shortTitle: string;
  sectionTitle: string;
  score: number;
  body: string;
  preview: string;
  cited: boolean;
  /** 1-based position among the retrieved chunks (score-descending, as the backend returns them). */
  rank: number;
  /** 0-based index into `FRAGMENT_TONES` (lib/palette.ts) for this chunk's color. */
  tone: number;
}

export type VerdictKey = 'supported' | 'partial' | 'unsupported' | 'wrong_status';

export interface VerdictViewModel {
  key: VerdictKey;
  label: 'Respaldada' | 'Parcial' | 'No respaldada' | 'Estado incorrecto';
  explanation: string;
}

export interface StageTimingViewModel {
  stage: StageName;
  ms: number;
  /** Cumulative ms elapsed before this stage started, over the present stages only. */
  startMs: number;
}

export interface TimingsViewModel {
  stages: StageTimingViewModel[];
  totalMs: number;
}

export interface AskViewModel {
  question: string;
  answer: string;
  status: AnswerStatus;
  isAnswered: boolean;
  chunks: ChunkViewModel[];
  /** Chunks that were cited, ordered by `response.sources` (citation order),
   * not by retrieval rank. */
  citedChunks: ChunkViewModel[];
  verdict: VerdictViewModel | null;
  timings: TimingsViewModel | null;
  /** `doc_id@version` of the manual these chunks came from, or `null` when nothing was retrieved. */
  docLabel: string | null;
}

const VERDICT_LABEL_BY_BACKEND_LABEL: Record<
  'supported' | 'unsupported' | 'incomplete' | 'wrong_status',
  { key: VerdictKey; label: VerdictViewModel['label'] }
> = {
  supported: { key: 'supported', label: 'Respaldada' },
  incomplete: { key: 'partial', label: 'Parcial' },
  unsupported: { key: 'unsupported', label: 'No respaldada' },
  wrong_status: { key: 'wrong_status', label: 'Estado incorrecto' },
};

/** `chunk_id`s look like `"alba-manual::19"`; the number after `::` is the
 * section number shown throughout the UI ("Frag. 19"). */
function chunkNumber(chunkId: string): number {
  const match = chunkId.match(/::(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}

/** `section_title`s look like `"19. Cómo solicitar vacaciones"`; the short
 * title drops the leading number for compact UI (tabs, dots). */
function stripLeadingNumber(sectionTitle: string): string {
  return sectionTitle.replace(/^\d+\.\s*/, '');
}

/** Chunk `text` looks like `"## 19. Título\n\n<body>"`. Drops that heading
 * line (already shown as `sectionTitle`) and trims the remaining body. */
function stripHeading(text: string): string {
  const lines = text.split('\n');
  if (lines[0]?.startsWith('##')) lines.shift();
  return lines.join('\n').trim();
}

/** First ~2 lines of an already-trimmed body, for card/tab previews. */
function previewOf(body: string): string {
  return body.split('\n').slice(0, 2).join('\n');
}

/** Backend timings are seconds; the UI works in rounded milliseconds throughout. */
function toMs(seconds: number): number {
  return Math.round(seconds * 1000);
}

function toChunkViewModel(
  chunk: QueryResponse['chunks_related'][number],
  index: number,
  sources: string[],
): ChunkViewModel {
  return {
    id: chunk.chunk_id,
    docLabel: `${chunk.doc_id}@${chunk.version}`,
    number: chunkNumber(chunk.chunk_id),
    shortTitle: stripLeadingNumber(chunk.section_title),
    sectionTitle: chunk.section_title,
    score: chunk.score,
    body: stripHeading(chunk.text),
    preview: previewOf(stripHeading(chunk.text)),
    cited: sources.includes(chunk.section_title),
    rank: index + 1,
    tone: index,
  };
}

function toTimingsViewModel(timings: QueryResponse['timings']): TimingsViewModel | null {
  if (!timings) return null;

  let cumulativeMs = 0;
  const stages: StageTimingViewModel[] = [];
  for (const stage of STAGE_NAMES) {
    const seconds = timings[stage];
    if (seconds === undefined) continue;
    const ms = toMs(seconds);
    stages.push({ stage, ms, startMs: cumulativeMs });
    cumulativeMs += ms;
  }

  const totalMs = timings.total !== undefined ? toMs(timings.total) : cumulativeMs;
  return { stages, totalMs };
}

export function toViewModel(response: QueryResponse): AskViewModel {
  const chunks = response.chunks_related.map((chunk, index) =>
    toChunkViewModel(chunk, index, response.sources),
  );
  const chunksBySectionTitle = new Map(chunks.map((chunk) => [chunk.sectionTitle, chunk]));
  const citedChunks = response.sources
    .map((source) => chunksBySectionTitle.get(source))
    .filter((chunk): chunk is ChunkViewModel => chunk !== undefined);

  const verdict = response.verification
    ? {
        ...VERDICT_LABEL_BY_BACKEND_LABEL[response.verification.label],
        explanation: response.verification.reason,
      }
    : null;

  return {
    question: response.user_question,
    answer: response.system_answer,
    status: response.status,
    isAnswered: response.status === 'answered',
    chunks,
    citedChunks,
    verdict,
    timings: toTimingsViewModel(response.timings),
    docLabel: chunks[0]?.docLabel ?? null,
  };
}

/** Spanish-list-joins fragment numbers: "Frag. 11", "Frag. 11 y 26", "Frag. 11, 26 y 25". */
export function fragmentListLabel(chunks: Array<{ number: number }>): string {
  if (chunks.length === 0) return '';

  const numbers = chunks.map((chunk) => String(chunk.number));
  if (numbers.length === 1) return `Frag. ${numbers[0]}`;

  const last = numbers[numbers.length - 1];
  const rest = numbers.slice(0, -1);
  return `Frag. ${rest.join(', ')} y ${last}`;
}
