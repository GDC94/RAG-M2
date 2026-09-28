import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('sets both aria-label and title from the required label prop', () => {
    render(
      <IconButton label="Cerrar panel">
        <span data-testid="icon" />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Cerrar panel' });
    expect(button).toHaveAttribute('title', 'Cerrar panel');
  });

  it('fires onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton label="Abrir" onClick={onClick}>
        <span />
      </IconButton>,
    );

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies hover/active scale transform classes', () => {
    render(
      <IconButton label="Abrir">
        <span />
      </IconButton>,
    );

    const className = screen.getByRole('button', { name: 'Abrir' }).className;
    expect(className).toContain('hover:scale-[1.04]');
    expect(className).toContain('active:scale-[.96]');
  });

  it('applies the requested size and variant', () => {
    render(
      <IconButton label="Abrir" size="20" variant="solid-white">
        <span />
      </IconButton>,
    );

    const className = screen.getByRole('button', { name: 'Abrir' }).className;
    expect(className).toContain('size-5');
    expect(className).toContain('bg-fg-strong');
  });
});
