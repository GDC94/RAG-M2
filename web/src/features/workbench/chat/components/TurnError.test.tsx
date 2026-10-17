import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TurnError } from './TurnError';

describe('TurnError', () => {
  it('shows "Consulta detenida." for a stopped turn', () => {
    render(<TurnError state="stopped" />);

    expect(screen.getByText('Consulta detenida.')).toBeInTheDocument();
  });

  it('shows the mapped message for a known error code', () => {
    render(<TurnError state="error" error={{ code: 'provider_timeout', message: 'timed out' }} />);

    expect(
      screen.getByText('El proveedor del modelo tardó demasiado en responder.'),
    ).toBeInTheDocument();
  });

  it('falls back to the generic message for an unknown error code', () => {
    render(<TurnError state="error" error={{ code: 'totally_unknown', message: 'boom' }} />);

    expect(screen.getByText('Ocurrió un error inesperado.')).toBeInTheDocument();
  });

  it('tells the user how long to wait when rate limited', () => {
    render(
      <TurnError
        state="error"
        error={{ code: 'rate_limited', message: 'x', retryAfterSeconds: 45 }}
      />,
    );

    expect(screen.getByText(/límite de consultas/i)).toBeInTheDocument();
    expect(screen.getByText(/45 segundos/)).toBeInTheDocument();
  });

  it.each([
    [1, '1 segundo'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [3600, '1 hora'],
    [5 * 3600 - 1, '5 horas'],
  ])('formats a %i second wait as "%s"', (seconds, expected) => {
    render(
      <TurnError
        state="error"
        error={{ code: 'rate_limited', message: 'x', retryAfterSeconds: seconds }}
      />,
    );

    expect(screen.getByText(new RegExp(`en ${expected}\\.`))).toBeInTheDocument();
  });

  it('falls back to a generic wait hint when the retry time is unknown', () => {
    render(<TurnError state="error" error={{ code: 'rate_limited', message: 'x' }} />);

    expect(screen.getByText(/límite de consultas/i)).toBeInTheDocument();
    expect(screen.getByText(/más tarde/i)).toBeInTheDocument();
  });
});
