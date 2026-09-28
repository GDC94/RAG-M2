import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PipelineProgress } from './PipelineProgress';

const PENDING_STAGES = {
  embed: 'pending',
  search: 'pending',
  generate: 'pending',
  verify: 'pending',
} as const;

function stageItem(title: RegExp) {
  const node = screen.getByText(title);
  const item = node.closest('li');
  if (!item) throw new Error(`Expected ${title} to be inside a <li>`);
  return item;
}

describe('PipelineProgress', () => {
  it('shows a loading title and every stage pending, with an accessible status label', () => {
    render(<PipelineProgress state="loading" stages={PENDING_STAGES} />);

    expect(screen.getByRole('status', { name: /buscando en el manual/i })).toBeInTheDocument();
    expect(screen.getByText('Consultando el manual…')).toBeInTheDocument();
    expect(within(stageItem(/generando embedding/i)).getByText(/pendiente/i)).toBeInTheDocument();
  });

  it('reflects in-progress and completed stage statuses', () => {
    render(
      <PipelineProgress
        state="loading"
        stages={{
          embed: 'completed',
          search: 'in-progress',
          generate: 'pending',
          verify: 'pending',
        }}
      />,
    );

    expect(within(stageItem(/generando embedding/i)).getByText(/completada/i)).toBeInTheDocument();
    expect(within(stageItem(/buscando fragmentos/i)).getByText(/en curso/i)).toBeInTheDocument();
    expect(within(stageItem(/generando respuesta/i)).getByText(/pendiente/i)).toBeInTheDocument();
  });

  it('shows the answered title and real durations from timings when successful', () => {
    render(
      <PipelineProgress
        state="success"
        status="answered"
        stages={{
          embed: 'completed',
          search: 'completed',
          generate: 'completed',
          verify: 'completed',
        }}
        timings={{ embed: 42, search: 108.6, generate: 412, verify: 90 }}
      />,
    );

    expect(screen.getByText('Respuesta encontrada !')).toBeInTheDocument();
    expect(within(stageItem(/generando respuesta/i)).getByText('412 ms')).toBeInTheDocument();
    expect(within(stageItem(/buscando fragmentos/i)).getByText('109 ms')).toBeInTheDocument();
  });

  it('shows "Omitida" for a skipped stage instead of a duration', () => {
    render(
      <PipelineProgress
        state="success"
        status="answered"
        stages={{
          embed: 'completed',
          search: 'completed',
          generate: 'completed',
          verify: 'completed',
        }}
        skipped={['verify']}
        timings={{ embed: 42, search: 108, generate: 412 }}
      />,
    );

    expect(within(stageItem(/verificando la respuesta/i)).getByText('Omitida')).toBeInTheDocument();
  });

  it('shows the not_in_manual title', () => {
    render(
      <PipelineProgress
        state="success"
        status="not_in_manual"
        stages={{
          embed: 'completed',
          search: 'completed',
          generate: 'completed',
          verify: 'completed',
        }}
      />,
    );

    expect(screen.getByText('No está en el manual')).toBeInTheDocument();
  });

  it('shows the client_policy title', () => {
    render(
      <PipelineProgress
        state="success"
        status="client_policy"
        stages={{
          embed: 'completed',
          search: 'completed',
          generate: 'completed',
          verify: 'completed',
        }}
      />,
    );

    expect(screen.getByText('Política del cliente')).toBeInTheDocument();
  });

  it('shows the error title and cancels the in-progress stage', () => {
    render(
      <PipelineProgress
        state="error"
        stages={{ embed: 'completed', search: 'cancelled', generate: 'pending', verify: 'pending' }}
      />,
    );

    expect(screen.getByText('No se pudo responder')).toBeInTheDocument();
    expect(within(stageItem(/buscando fragmentos/i)).getByText(/cancelada/i)).toBeInTheDocument();
  });

  it('shows the stopped title', () => {
    render(
      <PipelineProgress
        state="stopped"
        stages={{ embed: 'completed', search: 'cancelled', generate: 'pending', verify: 'pending' }}
      />,
    );

    expect(screen.getByText('Consulta detenida')).toBeInTheDocument();
  });
});
