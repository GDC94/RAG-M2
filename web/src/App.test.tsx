import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the workbench: sidebar wordmark and the chat composer with example chips', () => {
    render(<App />);

    expect(screen.getByText('Alba RAG')).toBeInTheDocument();
    expect(screen.getByLabelText('Escribí tu pregunta')).toHaveAttribute(
      'placeholder',
      'Preguntá algo sobre el manual de Alba…',
    );
    expect(screen.getByRole('button', { name: '¿Qué día se paga la nómina?' })).toBeInTheDocument();
  });
});
