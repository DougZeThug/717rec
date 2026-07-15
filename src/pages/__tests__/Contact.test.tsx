import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Contact from '../Contact';

const mockToast = vi.fn();
const mockSubmitContactRequest = vi.fn();

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    register: vi.fn(() => ({})),
    reset: vi.fn(),
    handleSubmit:
      (onSubmit: (data: unknown) => Promise<void>) =>
      async (e?: { preventDefault?: () => void }) => {
        e?.preventDefault?.();
        await onSubmit({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'general_question',
          message: 'Need help',
          website: '',
        });
      },
  }),
}));

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/support/ContactService', async () => {
  const actual = await vi.importActual('@/services/support/ContactService');
  return {
    ...actual,
    submitContactRequest: (...args: unknown[]) => mockSubmitContactRequest(...args),
  };
});
vi.mock('@/utils/analytics', () => ({ trackContactForm: vi.fn() }));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/transitions/PageTransition', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
}));
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    render,
  }: {
    render: (props: { field: { value: string; onChange: () => void } }) => React.ReactNode;
  }) => render({ field: { value: '', onChange: vi.fn() } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormMessage: () => null,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Contact page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitContactRequest.mockImplementation(() => Promise.resolve());
  });

  it('shows loading state during form submission', async () => {
    mockSubmitContactRequest.mockImplementation(() => new Promise<void>(() => undefined));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

    const submitButton = await screen.findByRole('button', { name: /Sending.../i });
    expect(submitButton).toBeDisabled();
  });

  it('shows happy path after successful submission', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));
    expect(await screen.findByText('Message Sent!')).toBeInTheDocument();
  });

  it('shows error branch toast when submission fails', async () => {
    mockSubmitContactRequest.mockRejectedValue(new Error('failed'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', variant: 'destructive' })
      );
    });
  });
});
