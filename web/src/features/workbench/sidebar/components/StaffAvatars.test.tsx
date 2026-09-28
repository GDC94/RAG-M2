import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STAFF_EXTRA_COUNT, STAFF_MEMBERS } from '../staff';
import { StaffAvatars } from './StaffAvatars';

describe('StaffAvatars', () => {
  it('renders one lazily-loaded 60x60 avatar per staff member, named by alt text', () => {
    render(<StaffAvatars />);

    for (const member of STAFF_MEMBERS) {
      const img = screen.getByAltText(member.name);
      expect(img).toHaveAttribute('src', member.avatarUrl);
      expect(img).toHaveAttribute('width', '60');
      expect(img).toHaveAttribute('height', '60');
      expect(img).toHaveAttribute('loading', 'lazy');
    }
  });

  it('overlaps every avatar but the first', () => {
    render(<StaffAvatars />);

    const images = STAFF_MEMBERS.map((member) => screen.getByAltText(member.name));
    expect(images[0].className).not.toContain('-ml-3.5');
    for (const img of images.slice(1)) {
      expect(img.className).toContain('-ml-3.5');
    }
  });

  it('ends with an overlapping "+N" counter for the rest of the team, without an image', () => {
    render(<StaffAvatars />);

    const counter = screen.getByTestId('staff-extra');
    expect(screen.getByText(`+${STAFF_EXTRA_COUNT}`)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(`${STAFF_EXTRA_COUNT} personas más`)).toHaveClass('sr-only');
    expect(counter.tagName).not.toBe('IMG');
    expect(counter.className).toContain('-ml-3.5');
    expect(screen.getAllByRole('img')).toHaveLength(STAFF_MEMBERS.length);
  });

  it('shows the caption', () => {
    render(<StaffAvatars />);

    expect(screen.getByText('Personal de Alba')).toBeInTheDocument();
    expect(screen.getByText('Consultas simuladas del equipo')).toBeInTheDocument();
  });
});
