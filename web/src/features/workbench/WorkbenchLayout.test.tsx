import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
