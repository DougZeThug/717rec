export type StorageParseError = 'missing' | 'invalid_json' | 'invalid_shape';

export interface StorageParseResult<T> {
  ok: boolean;
  value?: T;
  error?: StorageParseError;
}
