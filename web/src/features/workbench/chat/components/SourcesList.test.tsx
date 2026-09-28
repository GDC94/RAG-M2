import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { SourcesList } from './SourcesList';

function chunk(overrides: Partial<ChunkViewModel>): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.6923636198043823,
    body: 'body',
    preview: 'preview',
    cited: true,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

describe('SourcesList', () => {
  it('renders one row per retrieved chunk with title, doc label, rounded score and rank', () => {
    const chunks = [
      chunk({ id: 'a', cited: true, rank: 1, tone: 0 }),
      chunk({
        id: 'b',
        sectionTitle: '22. Licencias',
        cited: false,
        rank: 2,
        tone: 1,
        score: 0.5654,
      }),
    ];

    render(<SourcesList chunks={chunks} open onOpenChange={() => {}} onSelect={() => {}} />);

    expect(screen.getByText('19. Cómo solicitar vacaciones')).toBeInTheDocument();
    expect(screen.getByText('22. Licencias')).toBeInTheDocument();
    expect(screen.getAllByText('alba-manual@4.2')).toHaveLength(2);
    expect(screen.getByText('0.69')).toBeInTheDocument();
    expect(screen.getByText('0.57')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('marks cited chunks with a "Citada" tag and leaves non-cited chunks unmarked', () => {
    const chunks = [chunk({ id: 'a', cited: true }), chunk({ id: 'b', cited: false })];

    render(<SourcesList chunks={chunks} open onOpenChange={() => {}} onSelect={() => {}} />);

    expect(screen.getAllByText('Citada')).toHaveLength(1);
  });

  it('calls onSelect with the clicked chunk', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const chunks = [chunk({ id: 'a' }), chunk({ id: 'b', sectionTitle: '22. Licencias' })];

    render(<SourcesList chunks={chunks} open onOpenChange={() => {}} onSelect={onSelect} />);

    await user.click(screen.getByText('22. Licencias'));

    expect(onSelect).toHaveBeenCalledWith(chunks[1]);
  });

  it('shows the "Fuentes" title with a counter matching the chunk count', () => {
    const chunks = [chunk({ id: 'a' }), chunk({ id: 'b' }), chunk({ id: 'c' })];

    render(<SourcesList chunks={chunks} open onOpenChange={() => {}} onSelect={() => {}} />);

    expect(screen.getByText('Fuentes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('reflects the open prop via aria-expanded on the toggle', () => {
    render(
      <SourcesList chunks={[chunk({})]} open={false} onOpenChange={() => {}} onSelect={() => {}} />,
    );

    expect(screen.getByRole('button', { name: /Fuentes/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
