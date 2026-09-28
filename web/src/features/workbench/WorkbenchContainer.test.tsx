import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { AskResult } from '@/features/ask/api';
import { WorkbenchContainer } from './WorkbenchContainer';

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
        text: '## 19. Cómo solicitar vacaciones\n\nTexto del capítulo diecinueve.',
      },
    ],
    status: 'answered',
    sources: ['19. Cómo solicitar vacaciones'],
    verification: null,
    timings: { embed: 0.01, search: 0.02, generate: 0.3, total: 0.33 },
  },
};

describe('WorkbenchContainer', () => {
  it('renders the sidebar and the chat composer', () => {
    render(<WorkbenchContainer />);

    expect(screen.getByText('Alba RAG')).toBeInTheDocument();
    expect(screen.getByLabelText('Escribí tu pregunta')).toBeInTheDocument();
  });

  it('hides the sidebar-collapse button behind a "Mostrar barra lateral" toggle once collapsed', async () => {
    const user = userEvent.setup();
    render(<WorkbenchContainer />);

    expect(screen.queryByRole('button', { name: 'Mostrar barra lateral' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ocultar barra lateral' }));

    const showButton = await screen.findByRole('button', { name: 'Mostrar barra lateral' });
    expect(showButton).toBeInTheDocument();

    await user.click(showButton);

    expect(screen.queryByRole('button', { name: 'Mostrar barra lateral' })).not.toBeInTheDocument();
  });

  it('asks the question, renders the answer with its sources and detail card, and opens the panel state when the card is clicked', async () => {
    const user = userEvent.setup();
    const askFn = async () => successResult;
    render(<WorkbenchContainer askFn={askFn} />);

    await user.type(screen.getByLabelText('Escribí tu pregunta'), '¿Cómo solicito vacaciones?');
    await user.click(screen.getByRole('button', { name: 'Enviar pregunta' }));

    expect(
      await screen.findByText('Vas a Inicio, Ausencias, Solicitar ausencia.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver fragmento 1' })).toBeInTheDocument();
    expect(screen.getByText('Fuentes')).toBeInTheDocument();
    expect(screen.getByText('Detalle de la consulta')).toBeInTheDocument();

    const detailCard = screen.getByText('Detalle de la consulta').closest('button');
    expect(detailCard).not.toBeNull();
    expect(detailCard).toHaveTextContent('Abrir');

    // biome-ignore lint/style/noNonNullAssertion: asserted non-null above
    await user.click(detailCard!);

    expect(detailCard).toHaveTextContent('Cerrar');
  });

  it('drives the detail panel: opens on the detail tab, switches to a fragment, closes down to nothing, and opens JSON from the overflow menu', async () => {
    const user = userEvent.setup();
    const multiChunkResult: AskResult = {
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
            text: '## 19. Cómo solicitar vacaciones\n\nTexto del capítulo diecinueve.',
          },
          {
            chunk_id: 'alba-manual::22',
            doc_id: 'alba-manual',
            version: '4.2',
            section_title: '22. Licencias',
            score: 0.55,
            text: '## 22. Licencias\n\nTexto del capítulo veintidós.',
          },
        ],
        status: 'answered',
        sources: ['19. Cómo solicitar vacaciones'],
        verification: null,
        timings: { embed: 0.01, search: 0.02, generate: 0.3, total: 0.33 },
      },
    };
    const askFn = async () => multiChunkResult;
    render(<WorkbenchContainer askFn={askFn} />);

    await user.type(screen.getByLabelText('Escribí tu pregunta'), '¿Cómo solicito vacaciones?');
    await user.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
    await screen.findByText('Vas a Inicio, Ausencias, Solicitar ausencia.');

    // Opening the detail card shows the "Detalle de la consulta" tab.
    const detailCard = screen.getByText('Detalle de la consulta').closest('button');
    // biome-ignore lint/style/noNonNullAssertion: DetailCard is always a button
    await user.click(detailCard!);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Detalle de la consulta' }),
    ).toBeInTheDocument();

    // Clicking a fragment card switches the panel to that fragment's tab.
    await user.click(screen.getByText('Cómo solicitar vacaciones'));
    expect(
      screen.getByRole('heading', { level: 2, name: '19. Cómo solicitar vacaciones' }),
    ).toBeInTheDocument();

    // Closing the active fragment tab falls back to "detail"; closing that
    // last tab closes the panel entirely.
    await user.click(screen.getByRole('button', { name: 'Cerrar pestaña Frag. 19' }));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Detalle de la consulta' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar pestaña Detalle' }));
    expect(screen.queryByRole('button', { name: 'Cerrar panel' })).not.toBeInTheDocument();

    // Reopen the panel, then reveal the remaining tabs via the overflow
    // toggle and open the raw-JSON tab from it.
    const reopenedCard = screen.getByText('Detalle de la consulta').closest('button');
    // biome-ignore lint/style/noNonNullAssertion: DetailCard is always a button
    await user.click(reopenedCard!);

    await user.click(screen.getByRole('button', { name: 'Mostrar más pestañas' }));
    // Overflow items render icon-only in this panel width, so their
    // accessible name comes from the long-form `title` (tabTitle), not the
    // short pill label.
    expect(
      screen.getByRole('button', { name: '19. Cómo solicitar vacaciones' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '22. Licencias' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JSON crudo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'JSON crudo' }));

    const pre = document.querySelector('pre');
    expect(pre).not.toBeNull();
    const keySpan = screen.getByText('"user_question"');
    expect(keySpan.className).toContain('text-json-key');
  });
});
