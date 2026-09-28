import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChunkViewModel } from '@/features/ask/viewModel';
import { PanelTabs } from './PanelTabs';

function chunk(overrides: Partial<ChunkViewModel> = {}): ChunkViewModel {
  return {
    id: 'alba-manual::19',
    docLabel: 'alba-manual@4.2',
    number: 19,
    shortTitle: 'Cómo solicitar vacaciones',
    sectionTitle: '19. Cómo solicitar vacaciones',
    score: 0.69,
    body: 'body',
    preview: 'preview',
    cited: true,
    rank: 1,
    tone: 0,
    ...overrides,
  };
}

const chunks = [chunk()];

function baseProps() {
  return {
    tabs: ['detail', 'frag-0'] as const,
    active: 'detail' as const,
    overflowKeys: ['json'] as const,
    chunks,
    overflowOpen: false,
    onOverflowOpenChange: vi.fn(),
    compact: false,
    wide: false,
    onActivate: vi.fn(),
    onClose: vi.fn(),
    onOpen: vi.fn(),
    onToggleWide: vi.fn(),
    onClosePanel: vi.fn(),
  };
}

describe('PanelTabs', () => {
  it('renders one pill per open tab with its label', () => {
    render(<PanelTabs {...baseProps()} />);

    expect(screen.getByText('Detalle')).toBeInTheDocument();
    expect(screen.getByText('Frag. 19')).toBeInTheDocument();
  });

  it('activates a tab when its pill is clicked', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<PanelTabs {...baseProps()} onActivate={onActivate} />);

    await user.click(screen.getByText('Frag. 19'));
    expect(onActivate).toHaveBeenCalledWith('frag-0');
  });

  it('closes a tab from its × without activating it', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onClose = vi.fn();
    render(<PanelTabs {...baseProps()} onActivate={onActivate} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cerrar pestaña Frag. 19' }));

    expect(onClose).toHaveBeenCalledWith('frag-0');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('requests the overflow menu to open when its toggle is clicked', async () => {
    const user = userEvent.setup();
    const onOverflowOpenChange = vi.fn();
    render(<PanelTabs {...baseProps()} onOverflowOpenChange={onOverflowOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Mostrar más pestañas' }));

    expect(onOverflowOpenChange).toHaveBeenCalledWith(true);
  });

  it('opens a tab when an overflow item is selected, collapsing the menu', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onOverflowOpenChange = vi.fn();
    render(
      <PanelTabs
        {...baseProps()}
        overflowOpen
        onOpen={onOpen}
        onOverflowOpenChange={onOverflowOpenChange}
      />,
    );

    await user.click(screen.getByText('JSON'));

    expect(onOpen).toHaveBeenCalledWith('json');
    expect(onOverflowOpenChange).toHaveBeenCalledWith(false);
  });

  it('hides the overflow toggle when there is nothing left to open', () => {
    render(<PanelTabs {...baseProps()} overflowKeys={[]} />);

    expect(screen.queryByRole('button', { name: 'Mostrar más pestañas' })).not.toBeInTheDocument();
  });

  it('renders the expand/collapse and close-panel buttons, hidden while overflow is open', () => {
    const { rerender } = render(<PanelTabs {...baseProps()} overflowOpen={false} />);
    expect(screen.getByRole('button', { name: 'Expandir panel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar panel' })).toBeInTheDocument();

    rerender(<PanelTabs {...baseProps()} overflowOpen />);
    expect(screen.queryByRole('button', { name: 'Expandir panel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar panel' })).not.toBeInTheDocument();
  });

  it('shows "Reducir panel" instead of "Expandir panel" when wide', () => {
    render(<PanelTabs {...baseProps()} wide />);
    expect(screen.getByRole('button', { name: 'Reducir panel' })).toBeInTheDocument();
  });

  it('calls onToggleWide and onClosePanel from the right-side buttons', async () => {
    const user = userEvent.setup();
    const onToggleWide = vi.fn();
    const onClosePanel = vi.fn();
    render(<PanelTabs {...baseProps()} onToggleWide={onToggleWide} onClosePanel={onClosePanel} />);

    await user.click(screen.getByRole('button', { name: 'Expandir panel' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar panel' }));

    expect(onToggleWide).toHaveBeenCalledOnce();
    expect(onClosePanel).toHaveBeenCalledOnce();
  });

  it('hides inactive tab labels in compact mode but keeps the active tab label', () => {
    render(<PanelTabs {...baseProps()} compact />);

    expect(screen.getByText('Detalle')).toBeInTheDocument();
    expect(screen.queryByText('Frag. 19')).not.toBeInTheDocument();
  });
});
