import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PillButton } from './PillButton';

describe('PillButton', () => {
  it('renders its children and defaults to the primary variant', () => {
    render(<PillButton>Abrir</PillButton>);

    const button = screen.getByRole('button', { name: 'Abrir' });
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('rounded-full');
    expect(button.className).toContain('bg-fg-strong');
  });

  it('applies the muted variant', () => {
    render(<PillButton variant="muted">Cerrar</PillButton>);

    expect(screen.getByRole('button', { name: 'Cerrar' }).className).toContain('bg-ink-300');
  });

  it('applies the glass variant', () => {
    render(<PillButton variant="glass">Repo</PillButton>);

    const className = screen.getByRole('button', { name: 'Repo' }).className;
    expect(className).toContain('bg-fg-strong/4');
    expect(className).toContain('border-fg-strong/5');
  });

  it('fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PillButton onClick={onClick}>Abrir</PillButton>);

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
