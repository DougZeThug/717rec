export type StorageParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: 'missing' | 'invalid_json' | 'invalid_shape' };
