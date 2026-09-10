import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockToast = vi.hoisted(() => vi.fn());

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useToast', () => ({
  toast: mockToast,
  useToast: () => ({ toast: mockToast }),
}));

// PageTransition reads the navigation context, which the app supplies and this
// test does not need.
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The form has its own tests. Here it only needs to report that it sent.
vi.mock('@/components/contact/ContactForm', () => ({
  ContactForm: ({ onSent }: { onSent: () => void }) => (
    <button onClick={onSent}>pretend to send</button>
  ),
}));

import Contact from '../Contact';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/contact']}>
      <Contact />
    </MemoryRouter>
  );

beforeEach(() => {
  mockToast.mockReset();
});

describe('Contact page', () => {
  it('shows the message form', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /contact the league/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pretend to send/i })).toBeInTheDocument();
  });

  // Both forms used to tell the reader to use the other one (UX audit H-02).
  it('says where the message goes, and names one inbox', () => {
    renderPage();

    expect(screen.getByText(/admins/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /home page/i })).toBeNull();
  });

  it('points at no second form anywhere on the page', () => {
    const { container } = renderPage();

    expect(container.textContent).not.toMatch(/message form at the bottom/i);
    expect(container.querySelector('a[href="/#contact-panel"]')).toBeNull();
  });

  it('confirms a sent message, and offers to send another', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /pretend to send/i }));

    expect(screen.getByRole('heading', { name: /message sent/i })).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Message sent' }));

    await userEvent.click(screen.getByRole('button', { name: /send another message/i }));

    expect(screen.getByRole('button', { name: /pretend to send/i })).toBeInTheDocument();
  });
});
