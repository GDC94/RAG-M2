import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TurnStages } from '@/features/ask/useAsk';
import { WorkingSteps } from './WorkingSteps';

function stages(overrides: Partial<TurnStages>): TurnStages {
  return {
    embed: 'pending',
    search: 'pending',
    generate: 'pending',
    verify: 'pending',
    ...overrides,
  };
}

describe('WorkingSteps', () => {
  it('shows the shimmering elapsed-time label', () => {
    render(<WorkingSteps stages={stages({})} elapsedSeconds={7} />);

    expect(screen.getByText('Trabajando 7 s')).toBeInTheDocument();
    expect(screen.getByText('Ejecutando 4 pasos')).toBeInTheDocument();
  });

  it('renders all four stage labels in order', () => {
    render(<WorkingSteps stages={stages({})} elapsedSeconds={0} />);

    const labels = [
      'Generando embedding',
      'Buscando en el manual',
      'Redactando respuesta',
      'Verificando respuesta',
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('colors a running stage text-fg-strong and a pending stage text-fg-ghost', () => {
    render(
      <WorkingSteps
        stages={stages({ embed: 'completed', search: 'in-progress' })}
        elapsedSeconds={2}
      />,
    );

    const searchRow = screen.getByText('Buscando en el manual').closest('div');
    expect(searchRow?.className).toContain('text-fg-strong');

    const generateRow = screen.getByText('Redactando respuesta').closest('div');
    expect(generateRow?.className).toContain('text-fg-ghost');
  });

  it('colors a completed stage text-fg-muted', () => {
    render(<WorkingSteps stages={stages({ embed: 'completed' })} elapsedSeconds={1} />);

    const embedRow = screen.getByText('Generando embedding').closest('div');
    expect(embedRow?.className).toContain('text-fg-muted');
  });

  it('colors a cancelled stage text-fg-ghost', () => {
    render(<WorkingSteps stages={stages({ search: 'cancelled' })} elapsedSeconds={1} />);

    const searchRow = screen.getByText('Buscando en el manual').closest('div');
    expect(searchRow?.className).toContain('text-fg-ghost');
  });
});
