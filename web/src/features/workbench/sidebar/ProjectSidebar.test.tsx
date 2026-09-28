import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectSidebar } from './ProjectSidebar';

describe('ProjectSidebar', () => {
  it('renders the wordmark, description, repo link, staff, tech tags and footer', () => {
    render(<ProjectSidebar onCollapse={() => {}} />);

    expect(screen.getByText('Alba RAG')).toBeInTheDocument();
    expect(screen.getByText(/RAG sobre el manual interno de Alba People/)).toBeInTheDocument();
    expect(screen.getByText(/un segundo modelo verifica/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rag-m2/i })).toBeInTheDocument();
    expect(screen.getByText('Personal de Alba')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('alba-manual@4.2')).toBeInTheDocument();
  });

  it('places the repo link in the footer, next to the manual version', () => {
    render(<ProjectSidebar onCollapse={() => {}} />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toContainElement(screen.getByRole('link', { name: /rag-m2/i }));
    expect(footer).toContainElement(screen.getByText('alba-manual@4.2'));
  });

  it('calls onCollapse when the "Ocultar barra lateral" button is clicked', async () => {
    const user = userEvent.setup();
    const onCollapse = vi.fn();
    render(<ProjectSidebar onCollapse={onCollapse} />);

    await user.click(screen.getByRole('button', { name: 'Ocultar barra lateral' }));

    expect(onCollapse).toHaveBeenCalledOnce();
  });
});
