import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChunkLoadRecovery } from '../ChunkLoadRecovery';

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('ChunkLoadRecovery', () => {
  it('explains the connection rather than blaming the page, while offline', () => {
    onlineManager.setOnline(false);
    render(<ChunkLoadRecovery reload={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /did not download/i })).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('waits for the connection instead of reloading into the browser error page', () => {
    onlineManager.setOnline(false);
    const reload = vi.fn();

    render(<ChunkLoadRecovery reload={reload} />);

    expect(reload).not.toHaveBeenCalled();
  });

  it('loads the page again by itself once the connection returns', () => {
    onlineManager.setOnline(false);
    const reload = vi.fn();
    render(<ChunkLoadRecovery reload={reload} />);

    act(() => onlineManager.setOnline(true));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads once and not once per flap', () => {
    onlineManager.setOnline(false);
    const reload = vi.fn();
    render(<ChunkLoadRecovery reload={reload} />);

    act(() => onlineManager.setOnline(true));
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('lets an impatient reader try again by hand', async () => {
    onlineManager.setOnline(false);
    const reload = vi.fn();
    render(<ChunkLoadRecovery reload={reload} />);

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
