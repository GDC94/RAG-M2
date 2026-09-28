import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechTags } from './TechTags';

describe('TechTags', () => {
  it('renders all 10 tech tags with their display labels', () => {
    render(<TechTags />);

    for (const label of [
      'Python',
      'Pydantic',
      'OpenAI API',
      'Chroma',
      'FastAPI',
      'TypeScript',
      'React',
      'Vite',
      'Tailwind',
      'Zod',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('titles the list "Tecnologías utilizadas"', () => {
    render(<TechTags />);

    expect(screen.getByRole('heading', { name: 'Tecnologías utilizadas' })).toBeInTheDocument();
  });

  it('colors each tag from its palette tone', () => {
    render(<TechTags />);

    expect(screen.getByText('Python').className).toContain('text-tech-python');
    expect(screen.getByText('Zod').className).toContain('text-tech-zod');
    expect(screen.getByText('Chroma').className).toContain('text-tech-chroma');
    expect(screen.getByText('FastAPI').className).toContain('text-tech-fastapi');
  });
});
