import type { KnownErrorCode, QueryResponse, StageEvent } from './schemas';
import { ApiErrorSchema, QueryResponseSchema, StreamEventSchema } from './schemas';

/**
 * `aborted` covers a fetch rejecting because the caller's `AbortSignal` fired.
 * That is treated as an expected, caller-initiated outcome (not a network
 * failure), so it is reported as its own code instead of being rethrown or
 * folded into `network_error`.
 */
export type AskErrorCode =
  | KnownErrorCode
  | 'invalid_response'
  | 'network_error'
  | 'unknown_error'
  | 'aborted';

export type AskResult =
  | { ok: true; data: QueryResponse }
  | { ok: false; error: { code: string; message: string; status?: number } };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Shared by `askQuestion` and `askQuestionStream`: a fetch rejection is
 * either an intentional abort or an actual network failure. */
function fetchRejectionToResult(error: unknown): AskResult {
  if (isAbortError(error)) {
    return { ok: false, error: { code: 'aborted', message: 'The request was aborted' } };
  }
  const message = error instanceof Error ? error.message : 'Network request failed';
  return { ok: false, error: { code: 'network_error', message } };
}

/** Shared by `askQuestion` and `askQuestionStream`: parse a non-2xx response
 * body against the known `{ error: { code, message } }` envelope. */
async function parseErrorEnvelope(response: Response): Promise<AskResult> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        code: 'invalid_response',
        message: 'Response body is not valid JSON',
        status: response.status,
      },
    };
  }

  const parsedError = ApiErrorSchema.safeParse(body);
  if (parsedError.success) {
    return {
      ok: false,
      error: {
        code: parsedError.data.error.code,
        message: parsedError.data.error.message,
        status: response.status,
      },
    };
  }

  return {
    ok: false,
    error: {
      code: 'unknown_error',
      message: 'Unrecognized error response',
      status: response.status,
    },
  };
}

export async function askQuestion(
  question: string,
  options?: { signal?: AbortSignal; fetchFn?: typeof fetch },
): Promise<AskResult> {
  const fetchFn = options?.fetchFn ?? fetch;

  let response: Response;
  try {
    response = await fetchFn('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: options?.signal,
    });
  } catch (error) {
    return fetchRejectionToResult(error);
  }

  if (!response.ok) {
    return parseErrorEnvelope(response);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        code: 'invalid_response',
        message: 'Response body is not valid JSON',
        status: response.status,
      },
    };
  }

  const parsed = QueryResponseSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_response',
        message: 'Response body does not match the expected schema',
        status: response.status,
      },
    };
  }
  return { ok: true, data: parsed.data };
}

export interface AskQuestionStreamOptions {
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  onStage?: (event: StageEvent) => void;
}

/** Parses one ndjson line. Returns `null` for a stage event (already
 * forwarded to `onStage`) or a blank line, meaning "keep reading"; returns
 * the final `AskResult` for a `result`/`error` event or a malformed line. */
function handleStreamLine(line: string, onStage?: (event: StageEvent) => void): AskResult | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      error: { code: 'invalid_response', message: 'Received a malformed stream line' },
    };
  }

  const parsed = StreamEventSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_response',
        message: 'Stream event does not match the expected schema',
      },
    };
  }

  const event = parsed.data;
  if (event.type === 'stage') {
    onStage?.(event);
    return null;
  }
  if (event.type === 'result') {
    return { ok: true, data: event.data };
  }
  return { ok: false, error: { code: event.error.code, message: event.error.message } };
}

/**
 * Streams `POST /api/query/stream`'s ndjson body, calling `onStage` for each
 * stage event as it arrives and resolving once the terminal `result` or
 * `error` event is read (or the stream ends/fails before one arrives).
 */
export async function askQuestionStream(
  question: string,
  options?: AskQuestionStreamOptions,
): Promise<AskResult> {
  const fetchFn = options?.fetchFn ?? fetch;

  let response: Response;
  try {
    response = await fetchFn('/api/query/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: options?.signal,
    });
  } catch (error) {
    return fetchRejectionToResult(error);
  }

  if (!response.ok) {
    return parseErrorEnvelope(response);
  }

  if (!response.body) {
    return {
      ok: false,
      error: { code: 'invalid_response', message: 'Response has no body', status: response.status },
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const outcome = handleStreamLine(line, options?.onStage);
        if (outcome) return outcome;
        newlineIndex = buffer.indexOf('\n');
      }
    }
  } catch (error) {
    return fetchRejectionToResult(error);
  }

  if (buffer.trim().length > 0) {
    const outcome = handleStreamLine(buffer, options?.onStage);
    if (outcome) return outcome;
  }

  return {
    ok: false,
    error: {
      code: 'invalid_response',
      message: 'Stream ended without a terminal event',
      status: response.status,
    },
  };
}
