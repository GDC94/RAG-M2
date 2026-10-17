import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkbenchLayout } from './WorkbenchLayout';

describe('WorkbenchLayout', () => {
  it('applies the given grid-template-columns as an inline style', () => {
    const { container } = render(
      <WorkbenchLayout
        gridTemplateColumns="272px minmax(0,1fr) 0px"
        sidebarHidden={false}
        sidebar={<span>sidebar</span>}
        chat={<span>chat</span>}
        panel={<span>panel</span>}
      />,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('272px minmax(0,1fr) 0px');
  });

  it('renders all three slots', () => {
    render(
      <WorkbenchLayout
        gridTemplateColumns="272px minmax(0,1fr) 0px"
        sidebarHidden={false}
        sidebar={<span>my-sidebar</span>}
        chat={<span>my-chat</span>}
        panel={<span>my-panel</span>}
      />,
    );

    expect(screen.getByText('my-sidebar')).toBeInTheDocument();
    expect(screen.getByText('my-chat')).toBeInTheDocument();
    expect(screen.getByText('my-panel')).toBeInTheDocument();
  });

  it('hides the sidebar column with aria-hidden and inert when sidebarHidden is true', () => {
    render(
      <WorkbenchLayout
        gridTemplateColumns="0px minmax(0,1fr) 0px"
        sidebarHidden={true}
        sidebar={<span>my-sidebar</span>}
        chat={<span>my-chat</span>}
        panel={<span>my-panel</span>}
      />,
    );

    const sidebarColumn = screen.getByText('my-sidebar').closest('[aria-hidden]');
    expect(sidebarColumn).toHaveAttribute('aria-hidden', 'true');
    expect(sidebarColumn).toHaveAttribute('inert');
  });

  it('does not mark the sidebar column hidden when sidebarHidden is false', () => {
    render(
      <WorkbenchLayout
        gridTemplateColumns="272px minmax(0,1fr) 0px"
        sidebarHidden={false}
        sidebar={<span>my-sidebar</span>}
        chat={<span>my-chat</span>}
        panel={<span>my-panel</span>}
      />,
    );

    const sidebarColumn = screen.getByText('my-sidebar').parentElement;
    expect(sidebarColumn).not.toHaveAttribute('aria-hidden');
    expect(sidebarColumn).not.toHaveAttribute('inert');
  });

  describe('mobile', () => {
    const mobileProps = {
      gridTemplateColumns: 'minmax(0,1fr)',
      mobile: true,
      sidebar: <span>my-sidebar</span>,
      chat: <span>my-chat</span>,
    };

    it('renders a backdrop that dismisses the open sidebar drawer', async () => {
      const user = userEvent.setup();
      const onDismissSidebar = vi.fn();
      render(
        <WorkbenchLayout
          {...mobileProps}
          sidebarHidden={false}
          onDismissSidebar={onDismissSidebar}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Cerrar barra lateral' }));

      expect(onDismissSidebar).toHaveBeenCalledOnce();
    });

    it('has no backdrop while the drawer is hidden, and keeps it inert', () => {
      render(<WorkbenchLayout {...mobileProps} sidebarHidden={true} />);

      expect(
        screen.queryByRole('button', { name: 'Cerrar barra lateral' }),
      ).not.toBeInTheDocument();
      expect(screen.getByText('my-sidebar').closest('[inert]')).not.toBeNull();
    });

    it('shows the panel as a full-screen overlay only when there is one', () => {
      const { rerender } = render(
        <WorkbenchLayout {...mobileProps} sidebarHidden={true} panel={<span>my-panel</span>} />,
      );
      const sheet = screen.getByText('my-panel').parentElement;
      expect(sheet).toHaveClass('fixed', 'inset-0');

      rerender(<WorkbenchLayout {...mobileProps} sidebarHidden={true} />);
      expect(screen.queryByText('my-panel')).not.toBeInTheDocument();
    });
  });
});
