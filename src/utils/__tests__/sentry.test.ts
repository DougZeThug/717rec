import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestIdleCallbackFn = (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;
type GlobalWithRequestIdle = typeof globalThis & { requestIdleCallback?: RequestIdleCallbackFn };
type WindowWithRequestIdle = Window & { requestIdleCallback?: RequestIdleCallbackFn };

const runtimeGlobal = globalThis as GlobalWithRequestIdle;
const runtimeWindow = window as WindowWithRequestIdle;

const initMock = vi.fn();
const getClientMock = vi.fn();
const replayIntegrationMock = vi.fn(() => ({ name: 'replay' }));
const browserTracingIntegrationMock = vi.fn(() => ({ name: 'tracing' }));

vi.mock('@sentry/react', () => ({
  init: initMock,
  getClient: getClientMock,
  replayIntegration: replayIntegrationMock,
  browserTracingIntegration: browserTracingIntegrationMock,
}));

const importSentryModule = ({
  dsn = 'https://dsn@example.ingest.sentry.io/1',
  prod = false,
  mode = 'test',
}: {
  dsn?: string;
  prod?: boolean;
  mode?: string;
} = {}) => {
  vi.resetModules();
  vi.stubEnv('VITE_SENTRY_DSN', dsn);
  vi.stubEnv('PROD', prod);
  vi.stubEnv('MODE', mode);
  return import('../sentry');
};

const originalRequestIdleCallback = runtimeGlobal.requestIdleCallback;

describe('sentry utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    runtimeGlobal.requestIdleCallback = originalRequestIdleCallback;
  });

  describe('scrubUrl', () => {
    it('filters lowercase sensitive params', async () => {
      const { scrubUrl } = await importSentryModule();
      expect(scrubUrl('https://x.com/a?token=abc')).toBe('https://x.com/a?token=%5BFiltered%5D');
    });

    it('filters uppercase sensitive params', async () => {
      const { scrubUrl } = await importSentryModule();
      expect(scrubUrl('https://x.com/a?TOKEN=abc')).toBe('https://x.com/a?TOKEN=%5BFiltered%5D');
    });

    it('filters mixed-case sensitive params', async () => {
      const { scrubUrl } = await importSentryModule();
      const result = scrubUrl('https://x.com/a?Password=abc&Api_Key=xyz');
      expect(result).toContain('Password=%5BFiltered%5D');
      expect(result).toContain('Api_Key=%5BFiltered%5D');
    });

    it('leaves non-sensitive params untouched', async () => {
      const { scrubUrl } = await importSentryModule();
      expect(scrubUrl('https://x.com/a?page=2')).toBe('https://x.com/a?page=2');
    });

    it('preserves non-sensitive keys when mixed', async () => {
      const { scrubUrl } = await importSentryModule();
      const result = scrubUrl('https://x.com/a?page=2&TOKEN=abc&sort=asc');
      expect(result).toContain('page=2');
      expect(result).toContain('sort=asc');
      expect(result).toContain('TOKEN=%5BFiltered%5D');
    });

    it('handles relative URLs', async () => {
      const { scrubUrl } = await importSentryModule();
      expect(scrubUrl('/path?token=abc')).toContain('token=%5BFiltered%5D');
    });
  });

  describe('scrubQueryString', () => {
    it('filters lowercase params', async () => {
      const { scrubQueryString } = await importSentryModule();
      expect(scrubQueryString('token=abc')).toBe('token=%5BFiltered%5D');
    });

    it('filters uppercase params', async () => {
      const { scrubQueryString } = await importSentryModule();
      expect(scrubQueryString('TOKEN=abc')).toBe('TOKEN=%5BFiltered%5D');
    });

    it('filters mixed-case params', async () => {
      const { scrubQueryString } = await importSentryModule();
      const result = scrubQueryString('Password=abc&Api_Key=xyz');
      expect(result).toContain('Password=%5BFiltered%5D');
      expect(result).toContain('Api_Key=%5BFiltered%5D');
    });

    it('preserves leading ? when present', async () => {
      const { scrubQueryString } = await importSentryModule();
      expect(scrubQueryString('?token=abc')).toBe('?token=%5BFiltered%5D');
    });

    it('handles no leading ?', async () => {
      const { scrubQueryString } = await importSentryModule();
      expect(scrubQueryString('token=abc')).toBe('token=%5BFiltered%5D');
    });

    it('leaves non-sensitive params untouched', async () => {
      const { scrubQueryString } = await importSentryModule();
      expect(scrubQueryString('page=2')).toBe('page=2');
    });
  });

  describe('initSentry', () => {
    it('returns early when already initialized', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      initSentry();
      expect(initMock).toHaveBeenCalledTimes(1);
    });

    it('logs warning and returns when DSN is empty', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { initSentry } = await importSentryModule({ dsn: '' });

      initSentry();

      expect(initMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Sentry] DSN not configured - error reporting disabled'
      );
    });

    it('calls Sentry.init with expected config when DSN is present', async () => {
      runtimeGlobal.requestIdleCallback = vi.fn();
      const { initSentry } = await importSentryModule({
        dsn: 'https://abc@example.ingest.sentry.io/123',
        prod: true,
        mode: 'production',
      });

      initSentry();

      expect(initMock).toHaveBeenCalledTimes(1);
      const config = initMock.mock.calls[0][0];
      expect(config.enabled).toBe(true);
      expect(config.sendDefaultPii).toBe(false);
      expect(config.integrations).toEqual([]);
      expect(config.replaysSessionSampleRate).toBe(0.1);
      expect(config.replaysOnErrorSampleRate).toBe(1);
      expect(config.tracePropagationTargets).toHaveLength(2);
      expect(config.tracePropagationTargets[0]).toBe('localhost');
      expect(config.tracePropagationTargets[1]).toBeInstanceOf(RegExp);
      expect(config.initialScope.tags.app).toBe('717rec');
    });

    it('beforeBreadcrumb drops fetch error breadcrumb without status_code', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      const dropped = config.beforeBreadcrumb({
        category: 'fetch',
        level: 'error',
        data: {},
      });
      expect(dropped).toBeNull();
    });

    it('beforeBreadcrumb preserves status-code and non-fetch breadcrumbs', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      const fetchWithStatus = {
        category: 'fetch',
        level: 'error',
        data: { status_code: 500 },
      };
      const uiBreadcrumb = {
        category: 'ui.click',
        level: 'error',
        data: {},
      };

      expect(config.beforeBreadcrumb(fetchWithStatus)).toBe(fetchWithStatus);
      expect(config.beforeBreadcrumb(uiBreadcrumb)).toBe(uiBreadcrumb);
    });

    it('beforeSend scrubs request URL and query_string', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      const event = {
        request: {
          url: 'https://example.com/path?page=1&token=abc',
          query_string: 'page=1&password=abc',
        },
      };

      const result = config.beforeSend(event, { originalException: new Error('app error') });
      expect(result).toBe(event);
      expect(event.request.url).toContain('token=%5BFiltered%5D');
      expect(event.request.query_string).toContain('password=%5BFiltered%5D');
    });

    it('beforeSend drops known browser-noise errors', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      expect(
        config.beforeSend({}, { originalException: new Error('ResizeObserver loop exceeded') })
      ).toBeNull();
      expect(
        config.beforeSend({}, { originalException: new Error('Loading chunk 11 failed') })
      ).toBeNull();
    });

    it('beforeSend drops only true network TypeError variants', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      const networkErrors = [
        'Failed to fetch',
        'Load failed',
        'NetworkError when attempting to fetch resource.',
        'Network request failed',
      ];

      for (const message of networkErrors) {
        expect(config.beforeSend({}, { originalException: new TypeError(message) })).toBeNull();
      }
    });

    it('beforeSend keeps non-TypeError app errors that mention failed to fetch', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      const event = { message: 'Unhandled exception' };
      const result = config.beforeSend(event, {
        originalException: new Error('Failed to fetch match data payload'),
      });
      expect(result).toBe(event);
    });

    it('beforeSend handles captureMessage path when no originalException', async () => {
      const { initSentry } = await importSentryModule();
      initSentry();
      const config = initMock.mock.calls[0][0];

      expect(config.beforeSend({ message: 'Failed to fetch' }, {})).toBeNull();
      expect(config.beforeSend({ message: 'Failed to fetch player profile' }, {})).toEqual({
        message: 'Failed to fetch player profile',
      });
    });

    it('schedules lazy integrations via requestIdleCallback in PROD', async () => {
      const addIntegration = vi.fn();
      getClientMock.mockReturnValue({ addIntegration });
      const requestIdleCallbackMock = vi.fn((cb: () => void) => {
        cb();
        return 1;
      });
      runtimeGlobal.requestIdleCallback = requestIdleCallbackMock;

      const { initSentry } = await importSentryModule({ prod: true });
      initSentry();

      expect(requestIdleCallbackMock).toHaveBeenCalled();
      expect(addIntegration).toHaveBeenCalledTimes(2);
      expect(replayIntegrationMock).toHaveBeenCalledTimes(1);
      expect(browserTracingIntegrationMock).toHaveBeenCalledTimes(1);
    });

    it('schedules lazy integrations via setTimeout fallback in PROD without requestIdleCallback', async () => {
      const addIntegration = vi.fn();
      getClientMock.mockReturnValue({ addIntegration });
      delete runtimeWindow.requestIdleCallback;
      delete runtimeGlobal.requestIdleCallback;
      vi.spyOn(globalThis, 'setTimeout').mockImplementation((cb: TimerHandler) => {
        if (typeof cb === 'function') cb();
        return 1 as unknown as ReturnType<typeof setTimeout>;
      });

      const { initSentry } = await importSentryModule({ prod: true });
      initSentry();

      expect(setTimeout).toHaveBeenCalled();
      expect(addIntegration).toHaveBeenCalledTimes(2);
    });

    it('does not schedule lazy integrations in non-PROD', async () => {
      const requestIdleCallbackMock = vi.fn();
      runtimeGlobal.requestIdleCallback = requestIdleCallbackMock;
      const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      const { initSentry } = await importSentryModule({ prod: false, mode: 'test' });
      initSentry();

      expect(requestIdleCallbackMock).not.toHaveBeenCalled();
      expect(timeoutSpy).not.toHaveBeenCalled();
    });

    it('lazy integration adder is safe when getClient() returns null', async () => {
      getClientMock.mockReturnValue(null);
      runtimeGlobal.requestIdleCallback = vi.fn((cb: () => void) => {
        cb();
        return 1;
      });

      const { initSentry } = await importSentryModule({ prod: true });
      expect(() => initSentry()).not.toThrow();
      expect(replayIntegrationMock).not.toHaveBeenCalled();
      expect(browserTracingIntegrationMock).not.toHaveBeenCalled();
    });

    it('lazy integration adder suppresses thrown errors', async () => {
      getClientMock.mockImplementation(() => {
        throw new Error('boom');
      });
      runtimeGlobal.requestIdleCallback = vi.fn((cb: () => void) => {
        cb();
        return 1;
      });

      const { initSentry } = await importSentryModule({ prod: true });
      expect(() => initSentry()).not.toThrow();
    });
  });
});
