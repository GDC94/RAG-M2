import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('shows a Spanish message and the raw code for a known error code', () => {
    render(<ErrorMessage error={{ code: 'index_empty', message: 'The index has no vectors' }} />);

    expect(screen.getByText(/el índice está vacío/i)).toBeInTheDocument();
    expect(screen.getByText(/pnpm run bootstrap/i)).toBeInTheDocument();
    expect(screen.getByText(/index_empty/)).toBeInTheDocument();
    expect(screen.getByText(/the index has no vectors/i)).toBeInTheDocument();
  });

  it('maps network_error to a message about the local backend', () => {
    render(<ErrorMessage error={{ code: 'network_error', message: 'Failed to fetch' }} />);

    expect(screen.getByText(/no se pudo conectar con la api/i)).toBeInTheDocument();
    expect(screen.getByText(/:8000/)).toBeInTheDocument();
  });

  it('shows a generic Spanish message for an unrecognized code', () => {
    render(<ErrorMessage error={{ code: 'some_future_code', message: 'weird backend detail' }} />);

    expect(screen.getByText(/ocurrió un error inesperado/i)).toBeInTheDocument();
    expect(screen.getByText(/some_future_code/)).toBeInTheDocument();
    expect(screen.getByText(/weird backend detail/i)).toBeInTheDocument();
  });
});
