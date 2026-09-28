import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExampleChips } from './ExampleChips';

describe('ExampleChips', () => {
  it('renders the four example questions as chips', () => {
    render(<ExampleChips onSelect={() => {}} />);

    expect(
      screen.getByRole('button', { name: '¿Hace falta anotar un regalo de un cliente?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '¿Cuánto tengo para presentar un informe de gastos?',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '¿Cuál es el tope de hotel en Madrid?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Qué día se paga la nómina?' })).toBeInTheDocument();
  });

  it('calls onSelect with the chip question when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExampleChips onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: '¿Qué día se paga la nómina?' }));

    expect(onSelect).toHaveBeenCalledWith('¿Qué día se paga la nómina?');
  });
});
