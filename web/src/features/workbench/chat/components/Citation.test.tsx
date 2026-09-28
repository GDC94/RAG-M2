import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Citation } from './Citation';

describe('Citation', () => {
  it('renders the 1-based citation number with an accessible label', () => {
    render(<Citation number={2} onClick={() => {}} />);

    const marker = screen.getByRole('button', { name: 'Ver fragmento 2' });
    expect(marker).toHaveTextContent('2');
  });

  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Citation number={1} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Ver fragmento 1' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
