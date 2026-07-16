import { afterEach, describe, expect, it, vi } from 'vitest';

const captureError = vi.hoisted(() => vi.fn());
const captureMessage = vi.hoisted(() => vi.fn());

vi.mock('@/utils/sentry', () => ({ captureError, captureMessage }));

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    captureError.mockReset();
    captureMessage.mockReset();
  });

  const importLogger = ({ isDev, shouldLog }: { isDev: boolean; shouldLog: boolean }) => {
    vi.doMock('@/utils/logger-types', () => ({
      isDev,
      shouldLog: vi.fn(() => shouldLog),
    }));

    return import('@/utils/logger');
  };

  it('writes base, warning, and debug messages when log level permits them', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = await importLogger({ isDev: true, shouldLog: true });

    logger.log('hello');
    logger.warnLog('careful');
    logger.debugLog('details');
    logger.errorLog('broken');
    logger.imageErrorLog('Alpha', null);
    logger.successLog('Saved');
    logger.failureLog('Save failed', new Error('nope'));

    expect(consoleLog).toHaveBeenCalledWith('[717REC]', 'hello');
    expect(consoleWarn).toHaveBeenCalledWith(
      '[717REC WARN]',
      '🖼️ Image:',
      'Failed to load image for Alpha:',
      'no URL'
    );
    expect(consoleWarn).toHaveBeenCalledWith('[717REC WARN]', 'careful');
    expect(consoleLog).toHaveBeenCalledWith('[717REC DEBUG]', 'details');
    expect(consoleLog).toHaveBeenCalledWith('[717REC]', '✅ Saved', '');
    expect(consoleError).toHaveBeenCalledWith('[717REC ERROR]', 'broken');
    expect(consoleError).toHaveBeenCalledWith(
      '[717REC ERROR]',
      '❌ Save failed:',
      expect.any(Error)
    );
  });

  it('captures production Error arguments with message and additional context', async () => {
    const logger = await importLogger({ isDev: false, shouldLog: false });
    const error = new Error('database unavailable');
    const context = { table: 'teams' };

    logger.errorLog('Could not save team', context, error);

    expect(captureError).toHaveBeenCalledWith(error, {
      message: 'Could not save team',
      additionalArgs: [context],
    });
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('captures nested production Error objects when no direct Error argument is present', async () => {
    const logger = await importLogger({ isDev: false, shouldLog: false });
    const nested = new Error('nested failure');

    logger.errorLog('Wrapped failure', { nested, ignored: 'value' });

    expect(captureError).toHaveBeenCalledWith(nested, {
      message: 'Wrapped failure',
      additionalArgs: [{ nested, ignored: 'value' }],
    });
  });

  it('captures production string errors that are not filtered as network or image noise', async () => {
    const logger = await importLogger({ isDev: false, shouldLog: false });

    logger.errorLog('Unexpected failure', { code: 'E_UNKNOWN' });

    expect(captureMessage).toHaveBeenCalledWith('Unexpected failure', 'error', {
      additionalArgs: [{ code: 'E_UNKNOWN' }],
    });
  });

  it('filters production image and network string errors out of Sentry', async () => {
    const logger = await importLogger({ isDev: false, shouldLog: false });

    logger.errorLog('Image load error', { message: 'irrelevant' });
    logger.errorLog('Request failed', { message: 'Failed to fetch' });

    expect(captureError).not.toHaveBeenCalled();
    expect(captureMessage).not.toHaveBeenCalled();
  });
});
