import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { QueryResponse } from '@/features/ask/schemas';
import { JsonTab } from './JsonTab';

const data: QueryResponse = {
  user_question: '¿Cómo solicito vacaciones?',
  system_answer: 'Vas a Inicio.',
  chunks_related: [],
  status: 'answered',
  sources: [],
  verification: null,
  timings: null,
};

describe('JsonTab', () => {
  it('renders the pretty-printed JSON text', () => {
    render(<JsonTab data={data} />);

    const pre = document.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(JSON.stringify(data, null, 2));
  });

  it('highlights keys and string values with the json token classes', () => {
    render(<JsonTab data={data} />);

    const keySpan = screen.getByText('"user_question"');
    expect(keySpan.className).toContain('text-json-key');

    const stringSpan = screen.getByText('"answered"');
    expect(stringSpan.className).toContain('text-json-string');
  });
});
