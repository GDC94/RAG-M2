import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AskContainer } from './AskContainer';
import type { AskResult } from './api';
import type { StageEvent } from './schemas';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const successResult: AskResult = {
  ok: true,
  data: {
    user_question: '¿Cómo solicito vacaciones?',
    system_answer: 'Vas a Inicio, Ausencias, Solicitar ausencia.',
    chunks_related: [
      {
        chunk_id: 'alba-manual::19',
        doc_id: 'alba-manual',
        version: '4.2',
        section_title: '19. Cómo solicitar vacaciones',
        score: 0.69,
        text: 'Texto del capítulo diecinueve.',
      },
    ],
    status: 'answered',
    sources: ['19. Cómo solicitar vacaciones'],
    verification: null,
    timings: { embed: 10, search: 20, generate: 300 },
  },
};

describe('AskContainer', () => {
  it('advances the pipeline stages, then shows the answer with source chips', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<AskResult>();
    let onStage: ((event: StageEvent) => void) | undefined;
    const askFn = vi
      .fn()
      .mockImplementation((_q: string, options?: { onStage?: (e: StageEvent) => void }) => {
        onStage = options?.onStage;
        return promise;
      });
    render(<AskContainer askFn={askFn} />);

    await user.type(
      screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }),
      '¿Cómo solicito vacaciones?',
    );
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(screen.getByRole('status', { name: /buscando en el manual/i })).toBeInTheDocument();
    expect(screen.getByText('Consultando el manual…')).toBeInTheDocument();

    onStage?.({ type: 'stage', stage: 'embed', phase: 'start' });
    onStage?.({ type: 'stage', stage: 'embed', phase: 'end' });
    onStage?.({ type: 'stage', stage: 'search', phase: 'start' });

    resolve(successResult);

    expect(await screen.findByText('Respuesta encontrada !')).toBeInTheDocument();
    expect(screen.getByText('Respondida')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /19\. cómo solicitar vacaciones/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /buscando en el manual/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the error title and a Spanish error message when the request fails', async () => {
    const user = userEvent.setup();
    const askFn = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'network_error', message: 'Failed to fetch' },
    } satisfies AskResult);
    render(<AskContainer askFn={askFn} />);

    await user.type(
      screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }),
      '¿Cómo solicito vacaciones?',
    );
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText('No se pudo responder')).toBeInTheDocument();
    expect(screen.getByText(/no se pudo conectar con la api/i)).toBeInTheDocument();
  });

  it('sends the example question when it is clicked', async () => {
    const user = userEvent.setup();
    const askFn = vi.fn().mockResolvedValue(successResult);
    render(<AskContainer askFn={askFn} />);

    const [firstExample] = screen.getAllByRole('button', { name: /¿/ });
    const exampleText = firstExample?.textContent ?? '';
    await user.click(firstExample);

    expect(askFn).toHaveBeenCalledWith(exampleText, expect.anything());
    expect(await screen.findByText('Respuesta encontrada !')).toBeInTheDocument();
  });

  it('stops the in-flight request when the stop button is clicked', async () => {
    const user = userEvent.setup();
    const askFn = vi.fn().mockImplementation(
      (_q: string, options?: { signal?: AbortSignal }) =>
        new Promise<AskResult>((resolve) => {
          options?.signal?.addEventListener('abort', () => {
            resolve({ ok: false, error: { code: 'aborted', message: 'The request was aborted' } });
          });
        }),
    );
    render(<AskContainer askFn={askFn} />);

    await user.type(
      screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }),
      '¿Cómo solicito vacaciones?',
    );
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    const stopButton = await screen.findByRole('button', { name: /detener/i });
    await user.click(stopButton);

    expect(await screen.findByText('Consulta detenida')).toBeInTheDocument();
  });
});
