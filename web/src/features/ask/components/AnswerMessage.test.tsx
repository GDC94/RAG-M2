import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import answeredFixture from '../__fixtures__/query-response.answered.json';
import notInManualFixture from '../__fixtures__/query-response.not-in-manual.json';
import { QueryResponseSchema } from '../schemas';
import { AnswerMessage } from './AnswerMessage';

function parseFixture(fixture: unknown) {
  const result = QueryResponseSchema.parse(fixture);
  return result;
}

describe('AnswerMessage', () => {
  it('shows the "Respondida" badge for an answered response', () => {
    render(<AnswerMessage response={parseFixture(answeredFixture)} />);

    expect(screen.getByText('Respondida')).toBeInTheDocument();
  });

  it('shows the "No está en el manual" badge for a not_in_manual response', () => {
    render(<AnswerMessage response={parseFixture(notInManualFixture)} />);

    expect(screen.getByText('No está en el manual')).toBeInTheDocument();
  });

  it('shows the "Política del cliente" badge for a client_policy response', () => {
    render(
      <AnswerMessage response={parseFixture({ ...answeredFixture, status: 'client_policy' })} />,
    );

    expect(screen.getByText('Política del cliente')).toBeInTheDocument();
  });

  it('renders the system answer preserving newlines', () => {
    const response = parseFixture({
      ...answeredFixture,
      system_answer: 'Primera línea.\nSegunda línea.',
    });
    render(<AnswerMessage response={response} />);

    const answer = screen.getByText(
      (_content, element) => element?.textContent === 'Primera línea.\nSegunda línea.',
    );
    expect(answer).toHaveClass('whitespace-pre-line');
  });

  it('keeps details collapsed by default and expands on click', async () => {
    const user = userEvent.setup();
    render(
      <AnswerMessage
        response={parseFixture({ ...answeredFixture, sources: ['19. Cómo solicitar vacaciones'] })}
      />,
    );

    const toggle = screen.getByRole('button', { name: /ver detalles/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the details panel and reveals the matching chunk text when a source chip is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AnswerMessage
        response={parseFixture({
          ...answeredFixture,
          sources: ['22. Licencias por enfermedad y licencias parentales'],
        })}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /22\. licencias por enfermedad y licencias parentales/i }),
    );

    expect(screen.getByRole('button', { name: /ver detalles/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const collapsible = screen.getByTestId('chunk-text-alba-manual::22');
    expect(collapsible).toHaveAttribute('data-state', 'open');
  });
});
