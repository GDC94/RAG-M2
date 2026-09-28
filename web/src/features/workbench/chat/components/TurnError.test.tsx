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
});
