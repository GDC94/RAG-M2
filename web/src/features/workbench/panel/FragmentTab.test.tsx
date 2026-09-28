import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { FragmentTab } from './FragmentTab';

function chunk(overrides: Partial<ChunkViewModel> = {}): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.6923,
    body: 'Primer párrafo.\nSegunda línea del primer párrafo.\n\n- Ítem uno\n- Ítem dos\n\nÚltimo párrafo.',
    preview: 'Primer párrafo.',
    cited: false,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

describe('FragmentTab', () => {
  it('renders the section title, doc label and score as the subtitle', () => {
    render(<FragmentTab chunk={chunk()} onMissing={() => {}} />);

    expect(
      screen.getByRole('heading', { name: '19. Cómo solicitar vacaciones' }),
    ).toBeInTheDocument();
    expect(screen.getByText('alba-manual@4.2 · score 0.69')).toBeInTheDocument();
  });

  it('shows a "Citada" tag only when the chunk is cited', () => {
    const { rerender } = render(
      <FragmentTab chunk={chunk({ cited: false })} onMissing={() => {}} />,
    );
    expect(screen.queryByText('Citada')).not.toBeInTheDocument();

    rerender(<FragmentTab chunk={chunk({ cited: true })} onMissing={() => {}} />);
    expect(screen.getByText('Citada')).toBeInTheDocument();
  });

  it('renders paragraphs and "- " lines as a list', () => {
    render(<FragmentTab chunk={chunk()} onMissing={() => {}} />);

    expect(
      screen.getByText('Primer párrafo. Segunda línea del primer párrafo.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ítem uno').closest('li')).not.toBeNull();
    expect(screen.getByText('Ítem dos').closest('li')).not.toBeNull();
    expect(screen.getByText('Último párrafo.')).toBeInTheDocument();
  });

  it('calls onMissing and renders nothing when the chunk does not exist', () => {
    const onMissing = vi.fn();
    const { container } = render(<FragmentTab chunk={undefined} onMissing={onMissing} />);

    expect(container).toBeEmptyDOMElement();
    expect(onMissing).toHaveBeenCalledOnce();
  });
});
