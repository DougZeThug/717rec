import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom has no ResizeObserver, and the component uses one to notice that the
// bracket is wider than the screen. Keep the callbacks so a test can decide
// when a "resize" happens.
const resizeCallbacks: ResizeObserverCallback[] = [];
const observedElements: Element[] = [];
globalThis.ResizeObserver = class {
  constructor(callback: ResizeObserverCallback) {
    resizeCallbacks.push(callback);
  }
  observe = vi.fn((element: Element) => {
    observedElements.push(element);
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
} as unknown as typeof ResizeObserver;

/** Pretends the bracket is `scrollWidth` wide inside a `clientWidth` box. */
const resizeTo = (element: HTMLElement, scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true });
  act(() => {
    resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
  });
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockScriptIsReady = true;
let mockScriptError: string | null = null;
let mockIsInitialized = true;
let mockRenderError: string | null = null;

type MockMatch = { id: number; opponent1: { id: string } | null; opponent2: { id: string } | null };

// Capture the onMatchClicked callback passed by the component
let capturedOnMatchClicked: ((match: MockMatch) => void) | null = null;
// Capture the full options object handed to the renderer hook (latest call)
let capturedRendererOpts: Record<string, unknown> | null = null;

vi.mock('@/components/playoffs/viewer/useBracketsViewerScript', () => ({
  useBracketsViewerScript: () => ({
    isReady: mockScriptIsReady,
    error: mockScriptError,
  }),
}));

vi.mock('@/components/playoffs/viewer/useBracketsViewerRenderer', () => ({
  useBracketsViewerRenderer: (opts: {
    onMatchClicked?: (match: MockMatch) => void;
    [key: string]: unknown;
  }) => {
    capturedOnMatchClicked = opts.onMatchClicked ?? null;
    capturedRendererOpts = opts;
    return {
      isInitialized: mockIsInitialized,
      error: mockRenderError,
    };
  },
}));

vi.mock('@/components/playoffs/match-score-editor/BracketsManagerMatchEditor', () => ({
  BracketsManagerMatchEditor: ({
    isOpen,
    matchId,
    onClose,
    onSaved,
  }: {
    isOpen: boolean;
    matchId: number | null;
    onClose: () => void;
    onSaved?: () => void;
  }) =>
    isOpen ? (
      <div data-testid="bm-editor" data-match-id={String(matchId)}>
        <button data-testid="bm-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="bm-saved" onClick={onSaved}>
          Saved
        </button>
      </div>
    ) : null,
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PlayoffBracket, PlayoffTeam } from '@/types/playoffTypes';
import { warnLog } from '@/utils/logger';

import { BracketsViewerComponent } from '../BracketsViewerComponent';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeBracket = (overrides: Partial<PlayoffBracket> = {}): PlayoffBracket => ({
  id: 'bracket-1',
  name: 'Championship',
  format: 'single_elimination',
  state: 'in_progress',
  created_at: '2025-01-01T00:00:00Z',
  uses_brackets_manager: false,
  ...overrides,
});

const makeTeam = (id: string): PlayoffTeam => ({
  id,
  name: `Team ${id}`,
  seed: 1,
});

const teams = [makeTeam('t1'), makeTeam('t2')];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BracketsViewerComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resizeCallbacks.length = 0;
    observedElements.length = 0;
    capturedOnMatchClicked = null;
    capturedRendererOpts = null;
    mockScriptIsReady = true;
    mockScriptError = null;
    mockIsInitialized = true;
    mockRenderError = null;
  });

  describe('guard conditions', () => {
    it('renders error when bracket has no id', () => {
      render(
        <BracketsViewerComponent
          bracket={{ ...makeBracket(), id: '' } as unknown as PlayoffBracket}
          teams={teams}
        />
      );
      expect(screen.getByText('Cannot render bracket: Invalid data')).toBeInTheDocument();
    });

    it('renders "No bracket data available" when teams array is empty', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={[]} />);
      expect(screen.getByText('No bracket data available')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('renders script error message', () => {
      mockScriptError = 'Script failed to load';
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByText(/Error loading bracket/)).toBeInTheDocument();
    });

    it('renders render error message', () => {
      mockRenderError = 'Render failed';
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByText(/Error loading bracket/)).toBeInTheDocument();
    });

    // The message used to replace the whole viewer, which unmounted the element
    // the bracket draws into. The renderer hook bails while that element is
    // missing, so the render that would have cleared the error never ran and
    // the reader was stuck on the message until they left the page.
    it('keeps the bracket container mounted underneath the error', () => {
      mockRenderError = 'Render failed';
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      expect(screen.getByText(/Error loading bracket/)).toBeInTheDocument();
      expect(document.getElementById('brackets-viewer-container')).not.toBeNull();
    });

    it('does not talk over the error with a loading message', () => {
      mockRenderError = 'Render failed';
      mockIsInitialized = false;
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  describe('valid bracket rendering', () => {
    it('renders the bracket region with accessible aria-label', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(
        screen.getByRole('region', { name: /Playoff Bracket: Championship/i })
      ).toBeInTheDocument();
    });

    // The scroller keeps the viewport's width however wide the bracket gets, so
    // watching only it would never fire again after the viewer draws.
    it('watches the element the bracket is drawn into, not just the scroller', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      const region = screen.getByRole('region', { name: /Playoff Bracket: Championship/i });
      const drawnInto = document.getElementById('brackets-viewer-container');

      expect(observedElements).toContain(region);
      expect(drawnInto).not.toBeNull();
      expect(observedElements).toContain(drawnInto);
    });

    // Only round one fits on a phone. Nothing used to say the rest was there.
    it('offers a swipe hint once the bracket is wider than the screen', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      const region = screen.getByRole('region', { name: /Playoff Bracket: Championship/i });

      expect(screen.queryByText(/swipe to see later rounds/i)).not.toBeInTheDocument();

      resizeTo(region, 900, 390);

      expect(screen.getByText(/swipe to see later rounds/i)).toBeInTheDocument();
    });

    it('says nothing when the whole bracket fits', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      const region = screen.getByRole('region', { name: /Playoff Bracket: Championship/i });

      resizeTo(region, 390, 390);

      expect(screen.queryByText(/swipe to see later rounds/i)).not.toBeInTheDocument();
    });

    it('drops the hint once the reader has swiped', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      const region = screen.getByRole('region', { name: /Playoff Bracket: Championship/i });
      resizeTo(region, 900, 390);

      fireEvent.scroll(region);

      expect(screen.queryByText(/swipe to see later rounds/i)).not.toBeInTheDocument();
    });

    // Without a pointer, the arrow keys are the only way to reach the final.
    it('lets the keyboard reach and scroll the bracket', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      expect(
        screen.getByRole('region', { name: /Playoff Bracket: Championship/i })
      ).toHaveAttribute('tabindex', '0');
    });

    it('shows loading state when not initialized', () => {
      mockIsInitialized = false;
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('does not show loading state when initialized', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    });
  });

  describe('match click handling', () => {
    // No handler is passed in: the viewer opens the score editor on its own.
    it('opens the score editor for a brackets-manager match that has teams', async () => {
      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: true })}
          teams={teams}
        />
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 7, opponent1: { id: 't1' }, opponent2: { id: 't2' } });
      });

      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();
      expect(screen.getByTestId('bm-editor').dataset.matchId).toBe('7');
    });

    it('opens the score editor when only one team is known yet (late-round slot)', async () => {
      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: true })}
          teams={teams}
        />
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 7, opponent1: { id: 't1' }, opponent2: null });
      });

      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();
    });

    it('opens nothing for a legacy bracket that does not use brackets-manager', () => {
      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: false })}
          teams={teams}
        />
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 9, opponent1: { id: 't1' }, opponent2: { id: 't2' } });
      });

      expect(screen.queryByTestId('bm-editor')).not.toBeInTheDocument();
    });

    it('opens nothing for a match that has no teams yet, and says so in the log', () => {
      render(
        <BracketsViewerComponent
          bracket={makeBracket({ uses_brackets_manager: true })}
          teams={teams}
        />
      );

      act(() => {
        capturedOnMatchClicked?.({ id: 5, opponent1: null, opponent2: null });
      });

      expect(screen.queryByTestId('bm-editor')).not.toBeInTheDocument();
      expect(warnLog).toHaveBeenCalledWith('Match clicked but no participants determined yet');
    });
  });

  describe('renderer wiring', () => {
    it('passes the container id, bracket, and script readiness to the renderer hook', () => {
      const bracket = makeBracket();
      render(<BracketsViewerComponent bracket={bracket} teams={teams} />);

      expect(capturedRendererOpts).toMatchObject({
        bracket,
        containerId: 'brackets-viewer-container',
        isScriptReady: true,
      });
    });

    it('builds the refresh key from the external refresh signal', () => {
      render(
        <BracketsViewerComponent bracket={makeBracket()} teams={teams} refreshSignal={12345} />
      );

      expect(capturedRendererOpts?.refreshKey).toBe('0:12345');
    });

    it('defaults the refresh key when no refresh signal is provided', () => {
      render(<BracketsViewerComponent bracket={makeBracket()} teams={teams} />);

      expect(capturedRendererOpts?.refreshKey).toBe('0:initial');
    });

    it('changes the refresh key when the realtime refresh signal changes', () => {
      const bracket = makeBracket();
      const { rerender } = render(
        <BracketsViewerComponent bracket={bracket} teams={teams} refreshSignal={1} />
      );
      expect(capturedRendererOpts?.refreshKey).toBe('0:1');

      rerender(<BracketsViewerComponent bracket={bracket} teams={teams} refreshSignal={2} />);
      expect(capturedRendererOpts?.refreshKey).toBe('0:2');
    });
  });

  describe('BracketsManagerMatchEditor lifecycle', () => {
    it('closes editor and clears matchId when onClose is called', async () => {
      const bmBracket = makeBracket({ uses_brackets_manager: true });
      render(<BracketsViewerComponent bracket={bmBracket} teams={teams} />);

      // Open the editor
      act(() => {
        capturedOnMatchClicked?.({ id: 3, opponent1: { id: 't1' }, opponent2: null });
      });

      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();

      // Close it
      act(() => {
        screen.getByTestId('bm-close').click();
      });

      expect(screen.queryByTestId('bm-editor')).not.toBeInTheDocument();
    });

    it('bumps the renderer refresh key after a match result is saved when realtime is disabled', async () => {
      const bmBracket = makeBracket({ uses_brackets_manager: true });
      render(<BracketsViewerComponent bracket={bmBracket} teams={teams} />);

      expect(capturedRendererOpts?.refreshKey).toBe('0:initial');

      // Open the editor and save
      act(() => {
        capturedOnMatchClicked?.({ id: 3, opponent1: { id: 't1' }, opponent2: null });
      });
      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();

      act(() => {
        screen.getByTestId('bm-saved').click();
      });

      expect(capturedRendererOpts?.refreshKey).toBe('1:initial');
    });

    it('does not bump the renderer refresh key after save when realtime is enabled', async () => {
      const bmBracket = makeBracket({ uses_brackets_manager: true });
      render(<BracketsViewerComponent bracket={bmBracket} teams={teams} realtimeEnabled />);

      expect(capturedRendererOpts?.refreshKey).toBe('0:initial');

      // Open the editor and save
      act(() => {
        capturedOnMatchClicked?.({ id: 3, opponent1: { id: 't1' }, opponent2: null });
      });
      expect(await screen.findByTestId('bm-editor')).toBeInTheDocument();

      act(() => {
        screen.getByTestId('bm-saved').click();
      });

      // Realtime already handles the refresh, so the counter should stay at 0.
      expect(capturedRendererOpts?.refreshKey).toBe('0:initial');
    });
  });

  describe('module exports', () => {
    it('re-exports BracketsViewerComponent from the folder index', async () => {
      const indexModule = await import('../index');
      expect(indexModule.BracketsViewerComponent).toBe(BracketsViewerComponent);
    });
  });
});
