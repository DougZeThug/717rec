import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type RequestIdleCallbackFn = (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;
type GlobalWithRequestIdle = typeof globalThis & { requestIdleCallback?: RequestIdleCallbackFn };
type WindowWithRequestIdle = Window & { requestIdleCallback?: RequestIdleCallbackFn };

const runtimeGlobal = globalThis as GlobalWithRequestIdle;
const runtimeWindow = window as WindowWithRequestIdle;

const initMock = vi.fn();
const getClientMock = vi.fn();
const replayIntegrationMock = vi.fn(() => ({ name: 'replay' }));
const browserTracingIntegrationMock = vi.fn(() => ({ name: 'tracing' }));
const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();
const setUserMock = vi.fn();
const addBreadcrumbMock = vi.fn();
const metricsMock = { count: vi.fn(), gauge: vi.fn(), distribution: vi.fn() };

vi.mock('@sentry/react', () => ({
  init: initMock,
  getClient: getClientMock,
  replayIntegration: replayIntegrationMock,
  browserTracingIntegration: browserTracingIntegrationMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  setUser: setUserMock,
  addBreadcrumb: addBreadcrumbMock,
  metrics: metricsMock,
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

    it('returns the original string when the URL cannot be parsed', async () => {
      const { scrubUrl } = await importSentryModule();
      // A bare '[' starts an IPv6 host the URL parser cannot finish. The scrub
      // runs inside beforeSend, so it has to hand back the input rather than
      // throw and lose the event.
      expect(scrubUrl('http://[')).toBe('http://[');
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

    it('returns the original string when the query string cannot be parsed', async () => {
      const { scrubQueryString } = await importSentryModule();
      // URLSearchParams accepts any string, so the guard is defensive. Force it
      // to throw to prove the reporter degrades quietly instead of taking the
      // whole beforeSend hook down with it.
      const RealURLSearchParams = globalThis.URLSearchParams;
      // A plain function, not a class: `new` runs the body either way, and a
      // class whose only member is a constructor is just a function spelt long.
      function ThrowingURLSearchParams(): never {
        throw new TypeError('boom');
      }
      vi.stubGlobal('URLSearchParams', ThrowingURLSearchParams);

      try {
        expect(scrubQueryString('token=abc')).toBe('token=abc');
      } finally {
        vi.stubGlobal('URLSearchParams', RealURLSearchParams);
      }
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
      // Sentry 10's `sendDefaultPii: false` limits, spelled out for Sentry 11.
      const legacyPiiKeySnippets = ['forwarded', '-ip', 'remote-', 'via', '-user'];
      expect(config.dataCollection).toEqual({
        userInfo: false,
        cookies: false,
        httpHeaders: { deny: legacyPiiKeySnippets },
        urlQueryParams: { deny: legacyPiiKeySnippets },
        httpBodies: [],
        genAI: { inputs: false, outputs: false },
        databaseQueryData: false,
      });
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

    it('waits twelve seconds before installing the lazy integrations in PROD', async () => {
      const addIntegration = vi.fn();
      getClientMock.mockReturnValue({ addIntegration });

      const { initSentry } = await importSentryModule({ prod: true });

      // Fake timers replace requestIdleCallback too, so the spy goes on after
      // them or it is the one that gets replaced.
      vi.useFakeTimers();
      const requestIdleCallbackMock = vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline);
        return 1;
      });
      runtimeGlobal.requestIdleCallback = requestIdleCallbackMock;

      try {
        initSentry();

        // This used to pass the wait as requestIdleCallback's `timeout`, which
        // is a deadline rather than a delay, so the recorder installed at the
        // first idle gap — about a second in — instead of twelve seconds in.
        vi.advanceTimersByTime(11999);
        expect(requestIdleCallbackMock).not.toHaveBeenCalled();
        expect(addIntegration).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(requestIdleCallbackMock).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 3000,
        });
        expect(addIntegration).toHaveBeenCalledTimes(2);
        expect(replayIntegrationMock).toHaveBeenCalledTimes(1);
        expect(browserTracingIntegrationMock).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('still installs the lazy integrations in PROD without requestIdleCallback', async () => {
      const addIntegration = vi.fn();
      getClientMock.mockReturnValue({ addIntegration });
      delete (runtimeWindow as { requestIdleCallback?: RequestIdleCallbackFn }).requestIdleCallback;
      delete (runtimeGlobal as { requestIdleCallback?: RequestIdleCallbackFn }).requestIdleCallback;
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
      runtimeGlobal.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline);
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
      runtimeGlobal.requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline);
        return 1;
      });

      const { initSentry } = await importSentryModule({ prod: true });
      expect(() => initSentry()).not.toThrow();
    });
  });

  describe('captureError', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs to the console but sends nothing to Sentry outside production', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { captureError } = await importSentryModule({ prod: false });
      const error = new Error('boom');

      captureError(error, { page: 'teams' });

      expect(errorSpy).toHaveBeenCalledWith('[Error]:', error, { page: 'teams' });
      expect(captureExceptionMock).not.toHaveBeenCalled();
    });

    it('sends the error and its context to Sentry in production', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { captureError } = await importSentryModule({ prod: true });
      const error = new Error('boom');

      captureError(error, { page: 'teams' });

      expect(captureExceptionMock).toHaveBeenCalledWith(error, { extra: { page: 'teams' } });
    });

    it('keeps going when Sentry itself fails, because the error is already logged', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const sentryError = new Error('CORS blocked');
      captureExceptionMock.mockImplementationOnce(() => {
        throw sentryError;
      });
      const { captureError } = await importSentryModule({ prod: true });

      expect(() => captureError(new Error('boom'))).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Sentry] Failed to send error report (CORS/network issue):',
        sentryError
      );
    });
  });

  describe('captureMessage', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs to the console but sends nothing to Sentry outside production', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const { captureMessage } = await importSentryModule({ prod: false });

      captureMessage('hello');

      expect(logSpy).toHaveBeenCalledWith('[info]:', 'hello');
      expect(captureMessageMock).not.toHaveBeenCalled();
    });

    it('sends the message to Sentry at info level unless told otherwise', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const { captureMessage } = await importSentryModule({ prod: true });

      captureMessage('hello');
      captureMessage('careful', 'warning', { week: 4 });

      expect(captureMessageMock).toHaveBeenNthCalledWith(1, 'hello', {
        level: 'info',
        extra: undefined,
      });
      expect(captureMessageMock).toHaveBeenNthCalledWith(2, 'careful', {
        level: 'warning',
        extra: { week: 4 },
      });
    });

    it('keeps going when Sentry itself fails, because the message is already logged', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const sentryError = new Error('CORS blocked');
      captureMessageMock.mockImplementationOnce(() => {
        throw sentryError;
      });
      const { captureMessage } = await importSentryModule({ prod: true });

      expect(() => captureMessage('hello')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Sentry] Failed to send message (CORS/network issue):',
        sentryError
      );
    });
  });

  describe('thin Sentry wrappers', () => {
    it('setUser passes the user, or null on sign-out, to Sentry', async () => {
      const { setUser } = await importSentryModule();

      setUser({ id: 'u1', username: 'doug' });
      setUser(null);

      expect(setUserMock).toHaveBeenNthCalledWith(1, { id: 'u1', username: 'doug' });
      expect(setUserMock).toHaveBeenNthCalledWith(2, null);
    });

    it('addBreadcrumb passes the breadcrumb to Sentry', async () => {
      const { addBreadcrumb } = await importSentryModule();

      addBreadcrumb({ category: 'ui.click', message: 'Save' });

      expect(addBreadcrumbMock).toHaveBeenCalledWith({ category: 'ui.click', message: 'Save' });
    });

    it('metrics.count adds one unless given a value', async () => {
      const { metrics } = await importSentryModule();

      metrics.count('score.saved');
      metrics.count('score.saved', 3, { source: 'admin' });

      expect(metricsMock.count).toHaveBeenNthCalledWith(1, 'score.saved', 1, {
        attributes: undefined,
      });
      expect(metricsMock.count).toHaveBeenNthCalledWith(2, 'score.saved', 3, {
        attributes: { source: 'admin' },
      });
    });

    it('metrics.gauge and metrics.distribution pass name, value and attributes through', async () => {
      const { metrics } = await importSentryModule();

      metrics.gauge('teams.active', 26, { season: 'summer' });
      metrics.distribution('score.margin', 7);

      expect(metricsMock.gauge).toHaveBeenCalledWith('teams.active', 26, {
        attributes: { season: 'summer' },
      });
      expect(metricsMock.distribution).toHaveBeenCalledWith('score.margin', 7, {
        attributes: undefined,
      });
    });
  });
});
