import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RingCard } from './RingCard';

describe('RingCard', () => {
  it('renders as a plain div when no onClick is given', () => {
    render(<RingCard>content</RingCard>);

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a button and forwards clicks when onClick is given', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RingCard onClick={onClick}>content</RingCard>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies interactive hover classes only when interactive is true', () => {
    const { rerender, container } = render(<RingCard interactive>content</RingCard>);
    expect(container.firstElementChild?.className).toContain('hover:bg-ink-350');

    rerender(<RingCard>content</RingCard>);
    expect(container.firstElementChild?.className).not.toContain('hover:bg-ink-350');
  });
});
