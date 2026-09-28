import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';

describe('Composer', () => {
  it('renders the input with its placeholder and aria-label', () => {
    render(
      <Composer
        value=""
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={() => {}}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    expect(screen.getByLabelText('Escribí tu pregunta')).toHaveAttribute(
      'placeholder',
      'Preguntá algo sobre el manual de Alba…',
    );
  });

  it('shows the keyboard hint when the input is empty and not busy', () => {
    render(
      <Composer
        value=""
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={() => {}}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    expect(screen.getByText('⌘ + ↵')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar pregunta' })).not.toBeInTheDocument();
  });

  it('shows a send button once there is text, and calls onSubmit when clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Composer
        value="¿Cómo pido vacaciones?"
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={onSubmit}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows a stop button while busy, and calls onStop when clicked', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <Composer
        value="¿Cómo pido vacaciones?"
        onValueChange={() => {}}
        isBusy
        onSubmit={() => {}}
        onStop={onStop}
        maxLength={1000}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Enviar pregunta' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Detener' }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('submits on Enter in the input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Composer
        value="¿Cómo pido vacaciones?"
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={onSubmit}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    screen.getByLabelText('Escribí tu pregunta').focus();
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('submits on the global Ctrl+Enter shortcut even without the input focused', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Composer
        value="¿Cómo pido vacaciones?"
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={onSubmit}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    document.body.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('ignores the global Ctrl+Enter shortcut when busy or empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <Composer
        value=""
        onValueChange={() => {}}
        isBusy={false}
        onSubmit={onSubmit}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <Composer
        value="¿Cómo pido vacaciones?"
        onValueChange={() => {}}
        isBusy
        onSubmit={onSubmit}
        onStop={() => {}}
        maxLength={1000}
      />,
    );

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
