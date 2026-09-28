import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelHeader } from './PanelHeader';

describe('PanelHeader', () => {
  it('renders the title and subtitle', () => {
    render(<PanelHeader title="Detalle de la consulta" subtitle="¿Cómo solicito vacaciones?" />);

    expect(screen.getByRole('heading', { name: 'Detalle de la consulta' })).toBeInTheDocument();
    expect(screen.getByText('¿Cómo solicito vacaciones?')).toBeInTheDocument();
  });

  it('renders trailing content next to the title when given', () => {
    render(
      <PanelHeader
        title="Detalle de la consulta"
        subtitle="sub"
        trailing={<span>Respaldada</span>}
      />,
    );

    expect(screen.getByText('Respaldada')).toBeInTheDocument();
  });

  it('renders no trailing content when omitted', () => {
    const { container } = render(<PanelHeader title="Detalle" subtitle="sub" />);
    expect(container.querySelectorAll('header > div > *').length).toBe(1);
  });
});
