import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders a spinner with an accessible status for "running"', () => {
    render(<StepIndicator status="running" />);

    const indicator = screen.getByRole('status');
    expect(indicator.className).toContain('animate-spin');
    expect(indicator.className).toContain('border-t-fg-strong');
  });

  it('renders a hollow circle (no spin) for "pending"', () => {
    render(<StepIndicator status="pending" />);

    const indicator = screen.getByRole('status');
    expect(indicator.className).not.toContain('animate-spin');
    expect(indicator.className).toContain('rounded-full');
  });

  it('renders a hollow circle (no spin) for "done" too', () => {
    render(<StepIndicator status="done" />);

    const indicator = screen.getByRole('status');
    expect(indicator.className).not.toContain('animate-spin');
  });

  it('accepts a custom accessible label overriding the default', () => {
    render(<StepIndicator status="running" label="Generando embedding" />);

    expect(screen.getByRole('status', { name: 'Generando embedding' })).toBeInTheDocument();
  });
});
