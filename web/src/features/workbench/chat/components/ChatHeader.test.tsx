import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatHeader } from './ChatHeader';

describe('ChatHeader', () => {
  it('renders no buttons by default', () => {
    render(
      <ChatHeader
        sidebarHidden={false}
        onShowSidebar={() => {}}
        showOpenPanelButton={false}
        onOpenPanel={() => {}}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "Mostrar barra lateral" only when the sidebar is hidden', async () => {
    const user = userEvent.setup();
    const onShowSidebar = vi.fn();
    render(
      <ChatHeader
        sidebarHidden
        onShowSidebar={onShowSidebar}
        showOpenPanelButton={false}
        onOpenPanel={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar barra lateral' }));
    expect(onShowSidebar).toHaveBeenCalledOnce();
  });

  it('shows "Abrir panel de detalle" only when told to', async () => {
    const user = userEvent.setup();
    const onOpenPanel = vi.fn();
    render(
      <ChatHeader
        sidebarHidden={false}
        onShowSidebar={() => {}}
        showOpenPanelButton
        onOpenPanel={onOpenPanel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Abrir panel de detalle' }));
    expect(onOpenPanel).toHaveBeenCalledOnce();
  });
});
