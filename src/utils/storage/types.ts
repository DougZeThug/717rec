export type StorageParseError = 'missing' | 'invalid_json' | 'invalid_shape';

export type StorageParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StorageParseError };
