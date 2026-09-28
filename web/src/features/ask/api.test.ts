import { describe, expect, it, vi } from 'vitest';
import answeredFixture from './__fixtures__/query-response.answered.json';
import { askQuestion, askQuestionStream } from './api';
import type { StageEvent } from './schemas';

function fakeResponse(options: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  return {
    ok: options.ok,
    status: options.status,
    json: options.json,
  } as Response;
}

/** Builds a fake streamed `Response` whose body yields the given raw chunks
 * (each chunk may contain zero, one, or several newlines — this is how the
 * tests exercise lines that split across chunk boundaries). */
function fakeStreamResponse(options: {
  chunks: string[];
  ok?: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of options.chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    body,
    json:
      options.json ??
      (async () => {
        throw new Error('json() should not be called on a streamed 2xx response');
      }),
  } as unknown as Response;
}

function ndjson(...events: unknown[]): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join('');
}

describe('askQuestion', () => {
  it('returns ok data on a successful 200 response', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        fakeResponse({ ok: true, status: 200, json: async () => answeredFixture }),
      );

    const result = await askQuestion('¿Cómo solicito vacaciones?', { fetchFn });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('answered');
    }
  });

  it('sends a POST with a JSON body and content-type header to /api/query', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        fakeResponse({ ok: true, status: 200, json: async () => answeredFixture }),
      );

    await askQuestion('¿Cómo solicito vacaciones?', { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/query',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ question: '¿Cómo solicito vacaciones?' }),
      }),
    );
  });

  it('maps a 422 invalid_question envelope to an error result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 422,
        json: async () => ({
          error: { code: 'invalid_question', message: 'Question must not be empty' },
        }),
      }),
    );

    const result = await askQuestion('', { fetchFn });

    expect(result).toEqual({
      ok: false,
      error: { code: 'invalid_question', message: 'Question must not be empty', status: 422 },
    });
  });

  it('maps a 503 index_empty envelope to an error result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 'index_empty', message: 'The index is empty' } }),
      }),
    );

    const result = await askQuestion('question', { fetchFn });

    expect(result).toEqual({
      ok: false,
      error: { code: 'index_empty', message: 'The index is empty', status: 503 },
    });
  });

  it('returns invalid_response when a 200 body fails schema validation', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        fakeResponse({ ok: true, status: 200, json: async () => ({ nonsense: true }) }),
      );

    const result = await askQuestion('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_response');
      expect(result.error.status).toBe(200);
    }
  });

  it('returns invalid_response when a 200 body is not JSON', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeResponse({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );

    const result = await askQuestion('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_response');
    }
  });

  it('returns unknown_error when a non-2xx body does not match the error envelope', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        fakeResponse({ ok: false, status: 500, json: async () => ({ oops: 'not an envelope' }) }),
      );

    const result = await askQuestion('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unknown_error');
      expect(result.error.status).toBe(500);
    }
  });

  it('returns network_error when fetch rejects with a network failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await askQuestion('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('network_error');
    }
  });

  // Design decision: an aborted request (caller-cancelled via AbortSignal) is an
  // expected outcome, not a network failure, so it is reported as its own
  // `aborted` error code instead of being rethrown or folded into `network_error`.
  it('returns an aborted error when fetch rejects with an AbortError', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const result = await askQuestion('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('aborted');
    }
  });
});

describe('askQuestionStream', () => {
  it('sends a POST with a JSON body to /api/query/stream', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeStreamResponse({
        chunks: [ndjson({ type: 'result', data: answeredFixture })],
      }),
    );

    await askQuestionStream('¿Cómo solicito vacaciones?', { fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/query/stream',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ question: '¿Cómo solicito vacaciones?' }),
      }),
    );
  });

  it('calls onStage for each stage event in order, then resolves with the result', async () => {
    const raw =
      ndjson({ type: 'stage', stage: 'embed', phase: 'start' }) +
      ndjson({ type: 'stage', stage: 'embed', phase: 'end' }) +
      ndjson({ type: 'stage', stage: 'search', phase: 'start' }) +
      ndjson({ type: 'stage', stage: 'search', phase: 'end' }) +
      ndjson({ type: 'stage', stage: 'generate', phase: 'start' }) +
      ndjson({ type: 'stage', stage: 'generate', phase: 'end' }) +
      ndjson({ type: 'result', data: answeredFixture });

    // Split into arbitrary chunk boundaries that land mid-line, to exercise
    // buffering across `reader.read()` calls.
    const chunks = [raw.slice(0, 20), raw.slice(20, 55), raw.slice(55, 140), raw.slice(140)];
    const fetchFn = vi.fn().mockResolvedValue(fakeStreamResponse({ chunks }));
    const stages: StageEvent[] = [];

    const result = await askQuestionStream('question', {
      fetchFn,
      onStage: (event) => stages.push(event),
    });

    expect(stages).toEqual([
      { type: 'stage', stage: 'embed', phase: 'start' },
      { type: 'stage', stage: 'embed', phase: 'end' },
      { type: 'stage', stage: 'search', phase: 'start' },
      { type: 'stage', stage: 'search', phase: 'end' },
      { type: 'stage', stage: 'generate', phase: 'start' },
      { type: 'stage', stage: 'generate', phase: 'end' },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('answered');
    }
  });

  it('resolves ok:false with the stream error event', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeStreamResponse({
        chunks: [
          ndjson({ type: 'stage', stage: 'embed', phase: 'start' }),
          ndjson({ type: 'error', error: { code: 'provider_timeout', message: 'Too slow' } }),
        ],
      }),
    );

    const result = await askQuestionStream('question', { fetchFn });

    expect(result).toEqual({
      ok: false,
      error: { code: 'provider_timeout', message: 'Too slow' },
    });
  });

  it('returns invalid_response for a malformed stream line', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(fakeStreamResponse({ chunks: ['not json at all\n'] }));

    const result = await askQuestionStream('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_response');
    }
  });

  it('returns invalid_response when the stream ends without a terminal event', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeStreamResponse({
        chunks: [ndjson({ type: 'stage', stage: 'embed', phase: 'start' })],
      }),
    );

    const result = await askQuestionStream('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_response');
    }
  });

  it('maps a non-2xx error envelope the same way askQuestion does', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      fakeStreamResponse({
        chunks: [],
        ok: false,
        status: 422,
        json: async () => ({
          error: { code: 'invalid_question', message: 'Question must not be empty' },
        }),
      }),
    );

    const result = await askQuestionStream('', { fetchFn });

    expect(result).toEqual({
      ok: false,
      error: { code: 'invalid_question', message: 'Question must not be empty', status: 422 },
    });
  });

  it('returns an aborted error when fetch rejects with an AbortError', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const result = await askQuestionStream('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('aborted');
    }
  });

  it('returns network_error when fetch rejects with a network failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await askQuestionStream('question', { fetchFn });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('network_error');
    }
  });
});
