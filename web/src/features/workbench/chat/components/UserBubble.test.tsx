import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserBubble } from './UserBubble';

describe('UserBubble', () => {
  it('renders the question text with the bubble styling', () => {
    render(<UserBubble>¿Cómo pido vacaciones?</UserBubble>);

    const bubble = screen.getByText('¿Cómo pido vacaciones?');
    expect(bubble.className).toContain('self-end');
    expect(bubble.className).toContain('bg-bubble');
    expect(bubble.className).toContain('text-bubble-fg');
  });
});
