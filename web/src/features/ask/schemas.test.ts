import { describe, expect, it } from 'vitest';
import answeredFixture from './__fixtures__/query-response.answered.json';
import notInManualFixture from './__fixtures__/query-response.not-in-manual.json';
import { ApiErrorSchema, QueryResponseSchema, StreamEventSchema } from './schemas';

describe('QueryResponseSchema', () => {
  it('accepts a real answered response and defaults missing sources to []', () => {
    const result = QueryResponseSchema.safeParse(answeredFixture);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources).toEqual([]);
      expect(result.data.status).toBe('answered');
      expect(result.data.chunks_related).toHaveLength(2);
    }
  });

  it('accepts a not_in_manual response with empty chunks_related and null verification/timings', () => {
    const result = QueryResponseSchema.safeParse(notInManualFixture);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chunks_related).toEqual([]);
      expect(result.data.verification).toBeNull();
      expect(result.data.timings).toBeNull();
      expect(result.data.status).toBe('not_in_manual');
    }
  });

  it('accepts a missing timings field and defaults it to null', () => {
    const { timings, ...withoutTimings } = answeredFixture as Record<string, unknown>;

    const result = QueryResponseSchema.safeParse(withoutTimings);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timings).toBeNull();
    }
  });

  it('rejects an unknown status', () => {
    const result = QueryResponseSchema.safeParse({
      ...answeredFixture,
      status: 'archived',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a chunk score greater than 1', () => {
    const result = QueryResponseSchema.safeParse({
      ...answeredFixture,
      chunks_related: [{ ...answeredFixture.chunks_related[0], score: 1.5 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a chunk score less than 0', () => {
    const result = QueryResponseSchema.safeParse({
      ...answeredFixture,
      chunks_related: [{ ...answeredFixture.chunks_related[0], score: -0.1 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a verdict with an unknown label', () => {
    const result = QueryResponseSchema.safeParse({
      ...answeredFixture,
      verification: { label: 'maybe', reason: 'unclear' },
    });

    expect(result.success).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('parses a known error envelope', () => {
    const result = ApiErrorSchema.safeParse({
      error: { code: 'invalid_question', message: 'Question must not be empty' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts an unknown future error code as a plain string', () => {
    const result = ApiErrorSchema.safeParse({
      error: { code: 'some_future_code', message: 'Something new happened' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error.code).toBe('some_future_code');
    }
  });
});

describe('StreamEventSchema', () => {
  it('parses a stage event', () => {
    const result = StreamEventSchema.safeParse({ type: 'stage', stage: 'embed', phase: 'start' });

    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'stage') {
      expect(result.data.stage).toBe('embed');
      expect(result.data.phase).toBe('start');
    }
  });

  it('rejects a stage event with an unknown stage name', () => {
    const result = StreamEventSchema.safeParse({ type: 'stage', stage: 'rank', phase: 'start' });

    expect(result.success).toBe(false);
  });

  it('parses a result event carrying a full QueryResponse', () => {
    const result = StreamEventSchema.safeParse({ type: 'result', data: answeredFixture });

    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'result') {
      expect(result.data.data.status).toBe('answered');
    }
  });

  it('parses an error event', () => {
    const result = StreamEventSchema.safeParse({
      type: 'error',
      error: { code: 'internal_error', message: 'Unexpected server error' },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown event type', () => {
    const result = StreamEventSchema.safeParse({ type: 'progress', value: 0.5 });

    expect(result.success).toBe(false);
  });
});
