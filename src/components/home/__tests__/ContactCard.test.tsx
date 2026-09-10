import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import ContactCard from '../ContactCard';

const renderCard = () =>
  render(
    <MemoryRouter>
      <ContactCard />
    </MemoryRouter>
  );

describe('ContactCard', () => {
  it('sends the reader to the one message form', () => {
    renderCard();

    expect(screen.getByRole('link', { name: /send us a message/i })).toHaveAttribute(
      'href',
      '/contact'
    );
  });

  it('names what the form is for, so the reader knows it is the right one', () => {
    renderCard();

    expect(screen.getByText(/timeslot change/i)).toBeInTheDocument();
    expect(screen.getByText(/joining the league/i)).toBeInTheDocument();
  });

  // The old cross-referral links and any bookmark pointed here.
  it('keeps the anchor the old panel had', () => {
    const { container } = renderCard();

    expect(container.querySelector('#contact-panel')).not.toBeNull();
  });

  it('sends nobody to a second form, because there is not one', () => {
    const { container } = renderCard();

    expect(container.textContent).not.toMatch(/instead/i);
    expect(screen.queryByRole('link', { name: /home page/i })).not.toBeInTheDocument();
  });
});
