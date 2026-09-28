import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SourceChips } from './SourceChips';

describe('SourceChips', () => {
  it('renders nothing when there are no sources', () => {
    const { container } = render(<SourceChips sources={[]} onChipClick={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one chip per source and calls onChipClick with the source title', async () => {
    const user = userEvent.setup();
    const onChipClick = vi.fn();
    render(
      <SourceChips
        sources={['19. Cómo solicitar vacaciones', '22. Licencias por enfermedad']}
        onChipClick={onChipClick}
      />,
    );

    expect(
      screen.getByRole('button', { name: /19\. cómo solicitar vacaciones/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /22\. licencias por enfermedad/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /19\. cómo solicitar vacaciones/i }));

    expect(onChipClick).toHaveBeenCalledWith('19. Cómo solicitar vacaciones');
  });
});
