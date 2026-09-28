import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionForm } from './QuestionForm';

describe('QuestionForm', () => {
  it('trims the question and calls onSubmit, then clears the field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuestionForm onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox', { name: /escrib.* tu pregunta/i });
    await user.type(textarea, '  ¿Cómo pido vacaciones?  ');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(onSubmit).toHaveBeenCalledWith('¿Cómo pido vacaciones?');
    expect(textarea).toHaveValue('');
  });

  it('submits on Enter and inserts a newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuestionForm onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox', { name: /escrib.* tu pregunta/i });
    await user.type(textarea, 'primera línea{Shift>}{Enter}{/Shift}segunda línea');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('primera línea\nsegunda línea');

    await user.type(textarea, '{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('primera línea\nsegunda línea');
  });

  it('disables submit when the question is empty', () => {
    render(<QuestionForm onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });

  it('disables the textarea while busy', () => {
    render(<QuestionForm onSubmit={vi.fn()} busy />);

    expect(screen.getByRole('textbox', { name: /escrib.* tu pregunta/i })).toBeDisabled();
  });

  it('shows a stop button while busy, and clicking it calls onStop', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<QuestionForm onSubmit={vi.fn()} onStop={onStop} busy />);

    const stopButton = screen.getByRole('button', { name: /detener/i });
    expect(stopButton).toBeEnabled();
    await user.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not render a model picker', () => {
    render(<QuestionForm onSubmit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /elegir modelo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows a character counter that updates as the user types', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSubmit={vi.fn()} maxLength={1000} />);

    expect(screen.getByText('0/1000')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }), 'hola');

    expect(screen.getByText('4/1000')).toBeInTheDocument();
  });

  it('does not call onSubmit when the trimmed value is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuestionForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }), '   ');
    await user.type(screen.getByRole('textbox', { name: /escrib.* tu pregunta/i }), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
