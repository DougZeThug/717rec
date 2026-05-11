import { StorageParseResult } from './types';

export function parseStoredJson<T>(
  raw: string | null,
  validate: (v: unknown) => v is T
): StorageParseResult<T> {
  if (raw === null) {
    return { ok: false, error: 'missing' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  if (!validate(parsed)) {
    return { ok: false, error: 'invalid_shape' };
  }

  return { ok: true, value: parsed };
}
