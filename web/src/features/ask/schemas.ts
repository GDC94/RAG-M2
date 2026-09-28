import { z } from 'zod';

/**
 * Zod schemas mirroring the backend's Pydantic models (see `src/rag/models.py`
 * and `src/rag/errors.py`). Types are inferred from these schemas, never
 * hand-written, so the two stay in sync.
 */

export const AnswerStatusSchema = z.enum(['answered', 'not_in_manual', 'client_policy']);

export const VerdictSchema = z.object({
  label: z.enum(['supported', 'unsupported', 'incomplete', 'wrong_status']),
  reason: z.string(),
});

export const RelatedChunkSchema = z.object({
  chunk_id: z.string(),
  doc_id: z.string(),
  version: z.string(),
  section_title: z.string(),
  score: z.number().min(0).max(1),
  text: z.string(),
});

export const QueryResponseSchema = z.object({
  user_question: z.string(),
  system_answer: z.string(),
  chunks_related: z.array(RelatedChunkSchema),
  status: AnswerStatusSchema,
  sources: z.array(z.string()).default([]),
  verification: VerdictSchema.nullable().default(null),
  timings: z.record(z.string(), z.number()).nullable().default(null),
});

/**
 * Error codes the backend documents today (see `src/rag/errors.py` and the
 * FastAPI adapter in `src/api.py`). `ApiErrorSchema` keeps `code` as a plain
 * string so an unknown future code still parses; this union is only for
 * exhaustive UI mapping (e.g. picking a message per known code).
 */
export const KNOWN_ERROR_CODES = [
  'invalid_question',
  'invalid_request',
  'index_empty',
  'config_error',
  'index_model_mismatch',
  'provider_error',
  'provider_timeout',
  'request_cancelled',
  'stream_busy',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type AnswerStatus = z.infer<typeof AnswerStatusSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type RelatedChunk = z.infer<typeof RelatedChunkSchema>;
export type QueryResponse = z.infer<typeof QueryResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * NDJSON events emitted by `POST /api/query/stream` (see `src/api.py`).
 * Each line is exactly one of these, discriminated by `type`; the stream
 * always ends with exactly one `result` or `error` event.
 */
export const STAGE_NAMES = ['embed', 'search', 'generate', 'verify'] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export const StageEventSchema = z.object({
  type: z.literal('stage'),
  stage: z.enum(STAGE_NAMES),
  phase: z.enum(['start', 'end']),
});

export const ResultEventSchema = z.object({
  type: z.literal('result'),
  data: QueryResponseSchema,
});

export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  error: z.object({ code: z.string(), message: z.string() }),
});

export const StreamEventSchema = z.discriminatedUnion('type', [
  StageEventSchema,
  ResultEventSchema,
  ErrorEventSchema,
]);

export type StageEvent = z.infer<typeof StageEventSchema>;
export type ResultEvent = z.infer<typeof ResultEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
