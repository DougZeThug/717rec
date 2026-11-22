import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MatchStatusBadge } from '../MatchStatusBadge';

describe('MatchStatusBadge', () => {
  it.each([
    [0, 'Locked', 'Not editable yet', /saving will be allowed/i],
    [1, 'Waiting', 'Editable now', /saving will unlock it/i],
    [2, 'Ready', 'Editable now', /ready for score entry/i],
    [3, 'In Progress', 'Editable now', /score entry in progress/i],
    [4, 'Completed', 'Editable now', /can still be edited/i],
    [5, 'Archived', 'Editable now', /saving will temporarily unlock/i],
    [undefined, 'Unknown', 'Not editable yet', /status not available/i],
  ])('shows the editing wording for status %s', (status, label, editable, description) => {
    render(<MatchStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(`• ${editable}`)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it.each([
    [0, 'Locked', /earlier matches feeding into this one have not finished yet\.$/i],
    [1, 'Waiting', /has not promoted this match to ready yet\.$/i],
    [2, 'Ready', /ready for score entry/i],
    [3, 'In Progress', /score entry in progress/i],
    [4, 'Completed', /^final score recorded$/i],
    [5, 'Archived', /a later round has progressed after this match\.$/i],
    [undefined, 'Unknown', /status not available/i],
  ])('read-only: shows no editing wording for status %s', (status, label, description) => {
    render(<MatchStatusBadge status={status} readOnly />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.queryByText(/editable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/saving will/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/can still be edited/i)).not.toBeInTheDocument();
  });
});
